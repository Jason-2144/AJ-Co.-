import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { scrapeWebsite } from './services/scraper';
import { playwrightService } from './src/services/research/PlaywrightService';
import { buildAnalysisPrompt } from './src/services/analysis/PromptBuilder';
import { ollamaService } from './src/services/analysis/OllamaService';
import { EMAIL_CONFIG } from './src/services/email/EmailConfig';
import { buildEmailPrompt } from './src/services/email/EmailPromptBuilder';
import { EmailValidator } from './src/services/email/EmailValidator';
import { gmailAuth } from './src/services/gmail/GmailAuth';
import { DraftFormatter } from './src/services/gmail/DraftFormatter';
import { campaignRepository } from './src/services/campaign/CampaignRepository';
import { researchCrawler } from './src/services/research/ResearchCrawler';
import { researchVersionManager } from './src/services/research/ResearchVersionManager';
import { researchAggregator } from './src/services/research/ResearchAggregator';
import { whatsAppSender } from './src/services/whatsapp/WhatsAppSender';
import { geminiService } from './src/services/whatsapp/GeminiService';
import { buildReengagementPrompt, fillReengagementTemplate } from './src/prompts/whatsapp/reengagementTemplate';
import { supabase } from './src/lib/supabase';
import { bpRouter, startBpBackgroundJobs } from './src/services/beautifulPostman/bpRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Twilio webhooks post form-urlencoded payloads

  app.post("/api/research", async (req, res) => {
    const { prospectId, url } = req.body;
    if (!prospectId || !url) {
      return res.status(400).send("Missing prospectId or url parameters.");
    }
    try {
      const startTime = Date.now();

      // 1. Run crawl loop
      const pages = await researchCrawler.crawl(prospectId, url);

      // 2. Increment crawl session version
      const version = await researchVersionManager.incrementVersion(prospectId);

      // 3. Build AI aggregate pre-processed summary
      const { summary, confidence } = await researchAggregator.buildSummary(pages);

      // Locate homepage data for compatibility mappings
      const homepage = pages.find(p => p.url === url) || pages[0] || { url, cleanedContent: '', statusCode: 200, loadTimeMs: 0, contentLength: 0, crawledAt: new Date().toISOString() };

      const totalSize = pages.reduce((acc, curr) => acc + curr.contentLength, 0);

      // 4. Return WebsiteResearch object
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
      res.status(500).send(err?.message || "An unexpected error occurred during website crawling.");
    }
  });

  app.post("/api/analyse", async (req, res) => {
    const research = req.body;
    if (!research || !research.prospectId || !research.url) {
      return res.status(400).send("Missing WebsiteResearch fields.");
    }
    try {
      const { system, prompt } = buildAnalysisPrompt(research);
      const analysisResult = await ollamaService.generateAnalysis(system, prompt);
      res.json(analysisResult);
    } catch (err: any) {
      console.error(`AI Analysis failed for prospect ${research.prospectId}:`, err);
      res.status(500).send(err?.message || "An unexpected error occurred during AI analysis.");
    }
  });

  app.post("/api/email", async (req, res) => {
    const { analysis, prospect } = req.body;
    if (!analysis || !analysis.prospectId) {
      return res.status(400).send("Missing CompanyAnalysis payload.");
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
        return res.status(500).send("Ollama is offline. Please start your local Ollama server on port 11434.");
      }
      res.status(500).send(err?.message || "An unexpected error occurred during email generation.");
    }
  });

  app.get("/api/gmail/auth-url", (req, res) => {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
    const url = gmailAuth.getAuthUrl(appUrl);
    res.json({ url });
  });

  app.get("/api/gmail/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Authorization code parameter is missing.");
    }
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
    try {
      await gmailAuth.handleCallback(code as string, appUrl);
      const email = gmailAuth.getEmail();
      res.redirect(`/staff?tab=mailboxes&auth_success=true&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      console.error("OAuth callback exchange failure:", err);
      res.status(500).send(`OAuth callback exchange failed: ${err?.message}`);
    }
  });

  app.get("/api/gmail/status", (req, res) => {
    res.json({
      isAuthenticated: gmailAuth.isAuthenticated(),
      mockMode: gmailAuth.isMockMode(),
      email: gmailAuth.getEmail()
    });
  });

  app.post("/api/gmail/draft", async (req, res) => {
    const { prospect, email } = req.body;
    if (!prospect || !email) {
      return res.status(400).send("Missing prospect or email payload.");
    }
    if (!gmailAuth.isAuthenticated()) {
      return res.status(401).send("Gmail connection required. Please link your Google Account.");
    }

    try {
      const to = prospect.emails?.[0];
      if (!to) {
        throw new Error("Prospect email is missing. A recipient is required to draft an email.");
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

      const gmailResponse = await axios.post("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
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
      res.status(500).send(err?.response?.data?.error?.message || err?.message || "An unexpected error occurred during draft creation.");
    }
  });

  app.get("/api/campaigns", async (req, res) => {
    try {
      const data = await campaignRepository.list();
      res.json(data);
    } catch (err: any) {
      console.error("Failed to list campaigns:", err);
      res.status(500).send(err?.message || "Internal server error.");
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const data = await campaignRepository.get(req.params.id);
      if (!data) return res.status(404).send("Campaign not found.");
      res.json(data);
    } catch (err: any) {
      console.error("Failed to get campaign:", err);
      res.status(500).send(err?.message || "Internal server error.");
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const data = await campaignRepository.create(req.body);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to create campaign:", err);
      res.status(500).send(err?.message || "Internal server error.");
    }
  });

  app.patch("/api/campaigns/:id", async (req, res) => {
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
      console.error("Failed to update campaign:", err);
      res.status(500).send(err?.message || "Internal server error.");
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      await campaignRepository.delete(req.params.id);
      res.sendStatus(200);
    } catch (err: any) {
      console.error("Failed to delete campaign:", err);
      res.status(500).send(err?.message || "Internal server error.");
    }
  });

  app.get("/api/campaigns/:id/stats", async (req, res) => {
    try {
      const data = await campaignRepository.getStats(req.params.id);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to get campaign stats:", err);
      res.status(500).send(err?.message || "Internal server error.");
    }
  });
  async function generateNudgeSentence(prompt: string): Promise<string> {
    // Gemini is cloud-hosted and preferred when configured (works from a deployed server);
    // local Ollama is the fallback for offline/no-API-key development.
    const rawResponse = geminiService.isConfigured()
      ? await geminiService.generateJSON(prompt)
      : await ollamaService.runPrompt(prompt, { maxTokens: 512, json: true });

    // Strip any stray <think>...</think> reasoning, then extract the {"sentence": "..."} object
    const cleaned = rawResponse.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`AI response wasn't valid JSON: ${cleaned.slice(0, 200)}`);
    }
    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
    const nudgeSentence = String(parsed.sentence || '').trim();
    if (!nudgeSentence) {
      throw new Error('AI response had no "sentence" field.');
    }
    return nudgeSentence;
  }

  app.post("/api/whatsapp/generate", async (req, res) => {
    const { patient } = req.body;
    if (!patient || !patient.name || !patient.phone) {
      return res.status(400).send("Missing patient name or phone.");
    }
    try {
      const prompt = buildReengagementPrompt(patient);

      // The model occasionally returns malformed JSON — retry once before giving up,
      // since a second attempt usually succeeds and this avoids surfacing a
      // transient blip as a failure the user has to manually retry.
      let nudgeSentence: string;
      try {
        nudgeSentence = await generateNudgeSentence(prompt);
      } catch (firstErr: any) {
        console.warn(`WhatsApp message generation retrying after malformed response: ${firstErr.message}`);
        nudgeSentence = await generateNudgeSentence(prompt);
      }

      const firstName = patient.name.trim().split(/\s+/)[0];
      const message = fillReengagementTemplate(firstName, nudgeSentence);
      res.json({ message, variables: { '1': firstName, '2': nudgeSentence.trim() } });
    } catch (err: any) {
      console.error(`WhatsApp message generation failed for patient ${patient.id}:`, err);
      res.status(500).send(err?.message || "An unexpected error occurred during WhatsApp message generation.");
    }
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    const { to, variables } = req.body;
    if (!to || !variables) {
      return res.status(400).send("Missing to or variables parameters.");
    }
    try {
      const result = await whatsAppSender.sendMessage(to, variables);
      res.json(result);
    } catch (err: any) {
      console.error(`WhatsApp send failed for ${to}:`, err);
      res.status(500).send(err?.message || "An unexpected error occurred while sending the WhatsApp message.");
    }
  });

  app.post("/api/whatsapp/test-ping", async (req, res) => {
    const { to } = req.body;
    if (!to) {
      return res.status(400).send("Missing to parameter.");
    }
    try {
      const result = await whatsAppSender.sendTestPing(to);
      res.json(result);
    } catch (err: any) {
      console.error(`WhatsApp test ping failed for ${to}:`, err);
      res.status(500).send(err?.message || "An unexpected error occurred while sending the test message.");
    }
  });

  app.get("/api/whatsapp/status", (req, res) => {
    res.json({
      provider: whatsAppSender.getProvider(),
      mockMode: whatsAppSender.isMockMode(),
      fromNumber: whatsAppSender.getFromNumber(),
      hasApprovedTemplate: whatsAppSender.hasApprovedTemplate(),
    });
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const { MessageSid, MessageStatus, From, Body } = req.body;

      if (MessageStatus) {
        // Delivery/read status callback for a message we sent
        await supabase.from('whatsapp_messages').update({ status: MessageStatus }).eq('message_sid', MessageSid);
      } else if (Body && From) {
        // Inbound reply from a patient
        const fromPhone = String(From).replace(/^whatsapp:/, '');
        console.log(`WhatsApp reply from ${fromPhone}: ${Body}`);

        const { data: patientRows } = await supabase.from('patients').select('id').eq('phone', fromPhone).limit(1);
        const patientId = patientRows?.[0]?.id;
        if (patientId) {
          await supabase.from('whatsapp_messages').update({ status: 'replied' }).eq('patient_id', patientId);
        }
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error("WhatsApp webhook processing failed:", err);
      res.sendStatus(200); // Always acknowledge to prevent Twilio retry storms
    }
  });

  app.get("/test-scraper", async (req, res) => {
  console.log("Route hit");
  try {
    const text = await scrapeWebsite("https://ajandco.site");
    res.send(text.substring(0, 5000));
  } catch (err) {
    console.error(err);
    res.status(500).send("Scraping failed");
  }
});

  // Beautiful Postman — fully isolated outbound agent (see src/services/beautifulPostman/)
  app.use("/api/bp", bpRouter);
  startBpBackgroundJobs();

  // Enforce canonical domain redirects in production
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      const host = req.headers.host || "";
      if (host.includes("www.ajandco.site") || host.includes("vercel.app")) {
        return res.redirect(301, `https://ajandco.site${req.originalUrl}`);
      }
      next();
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
