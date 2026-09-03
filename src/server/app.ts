import express from 'express';
import axios from 'axios';
import { scrapeWebsite } from '../../services/scraper.js';
import { buildAnalysisPrompt } from '../services/analysis/PromptBuilder.js';
import { ollamaService } from '../services/analysis/OllamaService.js';
import { EMAIL_CONFIG } from '../services/email/EmailConfig.js';
import { buildEmailPrompt } from '../services/email/EmailPromptBuilder.js';
import { EmailValidator } from '../services/email/EmailValidator.js';
import { gmailAuth } from '../services/gmail/GmailAuth.js';
import { DraftFormatter } from '../services/gmail/DraftFormatter.js';
import { campaignRepository } from '../services/campaign/CampaignRepository.js';
import { researchCrawler } from '../services/research/ResearchCrawler.js';
import { researchVersionManager } from '../services/research/ResearchVersionManager.js';
import { researchAggregator } from '../services/research/ResearchAggregator.js';
import { bpRouter } from '../services/beautifulPostman/bpRoutes.js';

// All /api/* routes live here, shared between the local dev/persistent-host entry
// (server.ts, which also serves the SPA and calls app.listen) and the Vercel
// serverless entry (api/index.ts, which exports this app directly with no listen —
// Vercel invokes it as a per-request handler). Do NOT add app.listen, static file
// serving, or Vite middleware here; those are host-specific and belong in server.ts.
export function createApp() {
  const app = express();
  app.use(express.json());

  app.post('/api/research', async (req, res) => {
    const { prospectId, url } = req.body;
    if (!prospectId || !url) {
      return res.status(400).send('Missing prospectId or url parameters.');
    }
    try {
      const startTime = Date.now();

      const pages = await researchCrawler.crawl(prospectId, url);
      const version = await researchVersionManager.incrementVersion(prospectId);
      const { summary, confidence } = await researchAggregator.buildSummary(pages);

      const homepage = pages.find(p => p.url === url) || pages[0] || { url, cleanedContent: '', statusCode: 200, loadTimeMs: 0, contentLength: 0, crawledAt: new Date().toISOString() };
      const totalSize = pages.reduce((acc, curr) => acc + curr.contentLength, 0);

      const result = {
        prospectId,
        url,
        finalUrl: homepage.url,
        title: homepage.url === url ? 'Homepage Analysis' : 'Website Analysis',
        metaDescription: 'Aggregated website research profile.',
        headings: [],
        bodyText: homepage.cleanedContent,
        internalLinks: pages.map(p => p.url),
        images: [],
        extractedAt: new Date().toISOString(),
        duration: Date.now() - startTime,

        pagesCrawled: pages.length,
        totalSizeBytes: totalSize,
        version,
        lastCrawlTime: new Date().toISOString(),
        pages,
        researchSummary: summary,
        confidenceScore: confidence
      };

      res.json(result);
    } catch (err: any) {
      console.error(`Scraping failed for prospect ${prospectId} on URL ${url}:`, err);
      res.status(500).send(err?.message || 'An unexpected error occurred during website crawling.');
    }
  });

  app.post('/api/analyse', async (req, res) => {
    const research = req.body;
    if (!research || !research.prospectId || !research.url) {
      return res.status(400).send('Missing WebsiteResearch fields.');
    }
    try {
      const { system, prompt } = buildAnalysisPrompt(research);
      const analysisResult = await ollamaService.generateAnalysis(system, prompt);
      res.json(analysisResult);
    } catch (err: any) {
      console.error(`AI Analysis failed for prospect ${research.prospectId}:`, err);
      res.status(500).send(err?.message || 'An unexpected error occurred during AI analysis.');
    }
  });

  app.post('/api/email', async (req, res) => {
    const { analysis, prospect } = req.body;
    if (!analysis || !analysis.prospectId) {
      return res.status(400).send('Missing CompanyAnalysis payload.');
    }
    try {
      const { system, prompt } = buildEmailPrompt(analysis, prospect);
      const url = `${EMAIL_CONFIG.ollamaUrl}/api/generate`;

      const startTime = Date.now();
      const response = await axios.post(url, {
        model: EMAIL_CONFIG.modelName,
        system,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: EMAIL_CONFIG.temperature,
          num_predict: EMAIL_CONFIG.maxTokens,
        }
      }, {
        timeout: EMAIL_CONFIG.timeout,
      });

      if (response.status !== 200) {
        throw new Error(`Ollama returned status code: ${response.status}`);
      }

      const rawResponseText = response.data?.response;
      if (!rawResponseText) {
        throw new Error('Ollama returned empty response text.');
      }

      const duration = Date.now() - startTime;
      const parsedEmail = EmailValidator.cleanAndParse(rawResponseText);

      res.json({
        ...parsedEmail,
        duration,
      });
    } catch (err: any) {
      console.error(`AI Email Generation failed for prospect ${analysis.prospectId}:`, err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('connect ECONNREFUSED')) {
        return res.status(500).send('Ollama is offline. Please start your local Ollama server on port 11434.');
      }
      res.status(500).send(err?.message || 'An unexpected error occurred during email generation.');
    }
  });

  app.get('/api/gmail/auth-url', (req, res) => {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
    const url = gmailAuth.getAuthUrl(appUrl);
    res.json({ url });
  });

  app.get('/api/gmail/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code parameter is missing.');
    }
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
    try {
      await gmailAuth.handleCallback(code as string, appUrl);
      const email = gmailAuth.getEmail();
      res.redirect(`/staff?tab=mailboxes&auth_success=true&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      console.error('OAuth callback exchange failure:', err);
      res.status(500).send(`OAuth callback exchange failed: ${err?.message}`);
    }
  });

  app.get('/api/gmail/status', (req, res) => {
    res.json({
      isAuthenticated: gmailAuth.isAuthenticated(),
      mockMode: gmailAuth.isMockMode(),
      email: gmailAuth.getEmail()
    });
  });

  app.post('/api/gmail/draft', async (req, res) => {
    const { prospect, email } = req.body;
    if (!prospect || !email) {
      return res.status(400).send('Missing prospect or email payload.');
    }
    if (!gmailAuth.isAuthenticated()) {
      return res.status(401).send('Gmail connection required. Please link your Google Account.');
    }

    try {
      const to = prospect.emails?.[0];
      if (!to) {
        throw new Error('Prospect email is missing. A recipient is required to draft an email.');
      }

      const subject = email.subject;
      const plainText = DraftFormatter.formatPlainText(email.opening, email.body, email.opportunities, email.cta, email.signature);
      const htmlText = DraftFormatter.formatHtmlBody(email.opening, email.body, email.opportunities, email.cta, email.signature);

      if (gmailAuth.isMockMode()) {
        return res.json({
          draftId: `mock_draft_${Math.random().toString(36).substring(2, 10)}`,
          threadId: `mock_thread_${Math.random().toString(36).substring(2, 10)}`,
          createdTime: Date.now()
        });
      }

      const accessToken = await gmailAuth.getValidAccessToken();
      const rawMime = DraftFormatter.buildMimeBase64(to, subject, plainText, htmlText);

      const gmailResponse = await axios.post('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        message: {
          raw: rawMime
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      res.json({
        draftId: gmailResponse.data.id,
        threadId: gmailResponse.data.message?.threadId || gmailResponse.data.id,
        createdTime: Date.now()
      });
    } catch (err: any) {
      console.error(`Gmail Draft Creation failed for prospect ${prospect.id}:`, err?.response?.data || err?.message);
      res.status(500).send(err?.response?.data?.error?.message || err?.message || 'An unexpected error occurred during draft creation.');
    }
  });

  app.get('/api/campaigns', async (req, res) => {
    try {
      const data = await campaignRepository.list();
      res.json(data);
    } catch (err: any) {
      console.error('Failed to list campaigns:', err);
      res.status(500).send(err?.message || 'Internal server error.');
    }
  });

  app.get('/api/campaigns/:id', async (req, res) => {
    try {
      const data = await campaignRepository.get(req.params.id);
      if (!data) return res.status(404).send('Campaign not found.');
      res.json(data);
    } catch (err: any) {
      console.error('Failed to get campaign:', err);
      res.status(500).send(err?.message || 'Internal server error.');
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    try {
      const data = await campaignRepository.create(req.body);
      res.json(data);
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      res.status(500).send(err?.message || 'Internal server error.');
    }
  });

  app.patch('/api/campaigns/:id', async (req, res) => {
    try {
      const { action, ...updates } = req.body;
      if (action === 'duplicate') {
        const duplicated = await campaignRepository.duplicate(req.params.id);
        res.json(duplicated);
      } else {
        const data = await campaignRepository.update(req.params.id, updates);
        res.json(data);
      }
    } catch (err: any) {
      console.error('Failed to update campaign:', err);
      res.status(500).send(err?.message || 'Internal server error.');
    }
  });

  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      await campaignRepository.delete(req.params.id);
      res.sendStatus(200);
    } catch (err: any) {
      console.error('Failed to delete campaign:', err);
      res.status(500).send(err?.message || 'Internal server error.');
    }
  });

  app.get('/api/campaigns/:id/stats', async (req, res) => {
    try {
      const data = await campaignRepository.getStats(req.params.id);
      res.json(data);
    } catch (err: any) {
      console.error('Failed to get campaign stats:', err);
      res.status(500).send(err?.message || 'Internal server error.');
    }
  });

  app.use('/api/bp', bpRouter);

  app.get('/test-scraper', async (req, res) => {
    console.log('Route hit');
    try {
      const text = await scrapeWebsite('https://ajandco.site');
      res.send(text.substring(0, 5000));
    } catch (err) {
      console.error(err);
      res.status(500).send('Scraping failed');
    }
  });

  // Enforce canonical domain redirects in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      const host = req.headers.host || '';
      if (host.includes('www.ajandco.site') || host.includes('vercel.app')) {
        return res.redirect(301, `https://ajandco.site${req.originalUrl}`);
      }
      next();
    });
  }

  return app;
}
