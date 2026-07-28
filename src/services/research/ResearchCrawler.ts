import { playwrightService } from './PlaywrightService';
import { PageScorer } from './PageScorer';
import { ContentExtractor } from './ContentExtractor';
import { researchVersionManager } from './ResearchVersionManager';
import { RESEARCH_CONFIG } from './ResearchConfig';
import { VisitedPage, WebsiteResearch } from './ResearchTypes';
import { supabase } from '../../lib/supabase';

export class ResearchCrawler {
  /**
   * Runs the intelligent crawler for a given prospect website url.
   * Discovers internal links, detects change status, crawls pages in parallel, and saves cache.
   */
  async crawl(prospectId: string, homepageUrl: string): Promise<VisitedPage[]> {
    const browser = await playwrightService.getBrowser();
    
    // 1. Scraping the homepage first to discover links
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    const homepageLinks: string[] = [];
    
    try {
      console.log(`Starting crawl for prospect: ${prospectId} on homepage: ${homepageUrl}`);
      const response = await page.goto(homepageUrl, {
        waitUntil: 'networkidle',
        timeout: RESEARCH_CONFIG.timeout,
      });

      // Extract all internal links
      const rawLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map((a) => a.href)
          .filter(Boolean);
      });

      homepageLinks.push(...rawLinks);
    } catch (err) {
      console.error(`Failed to load homepage for crawl: ${homepageUrl}`, err);
      // If homepage fails, return empty list or fallback to single
      return [];
    } finally {
      await page.close();
      await context.close();
    }

    // 2. Score and filter discovered links
    const scored = PageScorer.scoreLinks(homepageLinks, homepageUrl);
    
    // Prioritize the top URLs to crawl, up to configured page bounds
    const topUrls = scored.slice(0, RESEARCH_CONFIG.maxPages - 1).map((s) => s.url);
    const urlsToVisit = Array.from(new Set([homepageUrl, ...topUrls]));

    // 3. Compute change diffs
    const diff = await researchVersionManager.getDiff(prospectId, urlsToVisit);
    console.log(`Crawl Diff calculated: New=[${diff.newUrls.length}], Removed=[${diff.removedUrls.length}]`);

    // Clean removed pages from cache
    if (diff.removedUrls.length > 0) {
      await supabase
        .from('research_pages')
        .delete()
        .eq('prospect_id', prospectId)
        .in('url', diff.removedUrls);
    }

    const visitedPages: VisitedPage[] = [];

    // 4. Crawl new/changed pages in parallel using configured workers
    const urlQueue = [...diff.newUrls];
    const workersCount = Math.min(RESEARCH_CONFIG.parallelWorkers, urlQueue.length || 1);

    const runWorker = async () => {
      while (urlQueue.length > 0) {
        const url = urlQueue.shift();
        if (!url) break;

        const workerContext = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1280, height: 800 },
          ignoreHTTPSErrors: true,
        });
        const workerPage = await workerContext.newPage();
        
        try {
          const startTime = Date.now();
          const response = await workerPage.goto(url, {
            waitUntil: 'networkidle',
            timeout: RESEARCH_CONFIG.timeout,
          });

          const statusCode = response ? response.status() : 200;
          const loadTimeMs = Date.now() - startTime;

          // Extract clean textual prose
          const cleanedContent = await ContentExtractor.extractCleanContent(workerPage);
          const contentLength = cleanedContent.length;

          const pageRecord: VisitedPage = {
            url,
            statusCode,
            loadTimeMs,
            contentLength,
            cleanedContent,
            crawledAt: new Date().toISOString(),
          };

          visitedPages.push(pageRecord);

          // Save page content to DB
          await supabase.from('research_pages').upsert({
            prospect_id: prospectId,
            url,
            status_code: statusCode,
            load_time_ms: loadTimeMs,
            content_length: contentLength,
            cleaned_content: cleanedContent,
            crawled_at: pageRecord.crawledAt,
          });

        } catch (err: any) {
          console.error(`Failed to crawl url: ${url}`, err?.message);
          
          // Screenshot failed pages
          let screenshotPath = '';
          try {
            const buffer = await workerPage.screenshot({ type: 'png' });
            screenshotPath = `data:image/png;base64,${buffer.toString('base64')}`;
          } catch (scErr) {
            // ignore screenshot capture errors
          }

          const failedPage: VisitedPage = {
            url,
            statusCode: 500,
            loadTimeMs: 0,
            contentLength: 0,
            cleanedContent: `Crawling failed: ${err?.message || 'Timeout'}`,
            screenshotPath: screenshotPath || undefined,
            crawledAt: new Date().toISOString(),
          };
          visitedPages.push(failedPage);

          await supabase.from('research_pages').upsert({
            prospect_id: prospectId,
            url,
            status_code: 500,
            load_time_ms: 0,
            content_length: 0,
            cleaned_content: failedPage.cleanedContent,
            screenshot_path: screenshotPath || null,
            crawled_at: failedPage.crawledAt,
          });
        } finally {
          await workerPage.close();
          await workerContext.close();
        }
      }
    };

    if (workersCount > 0) {
      await Promise.all(Array.from({ length: workersCount }, runWorker));
    }

    // 5. Load cached/unmodified pages from database to aggregate a complete list
    const { data: cachedRows } = await supabase
      .from('research_pages')
      .select('*')
      .eq('prospect_id', prospectId);

    const allPages: VisitedPage[] = (cachedRows || []).map((row: any) => ({
      id: row.id,
      url: row.url,
      statusCode: row.status_code,
      loadTimeMs: row.load_time_ms,
      contentLength: row.content_length,
      cleanedContent: row.cleaned_content,
      screenshotPath: row.screenshot_path || undefined,
      crawledAt: row.crawled_at,
    }));

    // 6. Log Session history
    const totalSize = allPages.reduce((acc, curr) => acc + curr.contentLength, 0);
    await supabase.from('research_sessions').upsert({
      prospect_id: prospectId,
      pages_crawled: allPages.length,
      total_size_bytes: totalSize,
      last_crawl_time: new Date().toISOString(),
    });

    return allPages;
  }
}

export const researchCrawler = new ResearchCrawler();
export default researchCrawler;
