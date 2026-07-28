import { chromium, Browser } from 'playwright';
import { RESEARCH_CONFIG } from './ResearchConfig';

export class PlaywrightService {
  private static instance: PlaywrightService | null = null;
  private browser: Browser | null = null;

  private constructor() {}

  /**
   * Singleton accessor for playwright services on backend node instance.
   */
  static getInstance(): PlaywrightService {
    if (!PlaywrightService.instance) {
      PlaywrightService.instance = new PlaywrightService();
    }
    return PlaywrightService.instance;
  }

  /**
   * Launches or returns the single background browser.
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: RESEARCH_CONFIG.headless,
      });
    }
    return this.browser;
  }

  /**
   * Closes the active browser instance to release memories.
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Navigates to target website, follows redirects, extracts and cleans text content.
   */
  async scrape(prospectId: string, url: string): Promise<any> {
    const browser = await this.getBrowser();

    // Create a new context per request for security and tracking isolation
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true, // Handle SSL/TLS errors gracefully
    });

    const page = await context.newPage();

    try {
      const startTime = Date.now();

      // Load homepage URL
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: RESEARCH_CONFIG.timeout,
      });

      const httpStatus = response ? response.status() : 200;

      // Extract final URL post-redirects
      const finalUrl = page.url();

      // Extract Title
      const title = await page.title();

      // Extract Meta Description
      const metaDescription =
        (await page
          .locator('meta[name="description"]')
          .getAttribute('content')
          .catch(() => '')) || '';

      // Extract H1 & H2 Headings
      const headings = await page.evaluate(() => {
        const h1s = Array.from(document.querySelectorAll('h1')).map((el) =>
          el.innerText.trim()
        );
        const h2s = Array.from(document.querySelectorAll('h2')).map((el) =>
          el.innerText.trim()
        );
        return [...h1s, ...h2s].filter(Boolean);
      });

      // Extract Internal Links (limit to config maxLinks)
      const internalLinks = await page.evaluate((maxLinks) => {
        const currentHostname = window.location.hostname;
        const links = Array.from(document.querySelectorAll('a'))
          .map((a) => a.href)
          .filter((href) => {
            try {
              const urlObj = new URL(href);
              return urlObj.hostname === currentHostname;
            } catch (e) {
              return false;
            }
          });
        return Array.from(new Set(links)).slice(0, maxLinks);
      }, RESEARCH_CONFIG.maxLinks);

      // Extract Images (limit to config maxImages)
      const images = await page.evaluate((maxImages) => {
        return Array.from(document.querySelectorAll('img'))
          .map((img) => ({
            src: img.src || img.getAttribute('data-src') || '',
            alt: img.alt || '',
          }))
          .filter((img) => img.src)
          .slice(0, maxImages);
      }, RESEARCH_CONFIG.maxImages);

      // Extract and clean visible text
      const bodyText = await page.evaluate((maxSize) => {
        // 1. Remove script/style elements
        const excludeTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'header', 'footer', 'nav'];
        excludeTags.forEach((tag) => {
          document.querySelectorAll(tag).forEach((el) => el.remove());
        });

        // 2. Remove hidden nodes
        document.querySelectorAll('*').forEach((el: any) => {
          try {
            const style = window.getComputedStyle(el);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              style.opacity === '0'
            ) {
              el.remove();
            }
          } catch (e) {
            // Ignore computing styles errors
          }
        });

        // 3. Remove Cookie popups / consent banners
        const cookieBannerKeywords = ['cookie', 'consent', 'gdpr', 'banner-cookie', 'privacy-policy', 'terms'];
        document.querySelectorAll('div, section, dialog').forEach((el) => {
          const idOrClass = (el.id + ' ' + el.className).toLowerCase();
          if (cookieBannerKeywords.some((kw) => idOrClass.includes(kw))) {
            el.remove();
          }
        });

        // 4. Fetch clean text content
        const rawText = document.body.innerText || document.body.textContent || '';
        
        // 5. Clean layout whitespaces
        const collapsed = rawText.replace(/\s+/g, ' ').trim();
        return collapsed.slice(0, maxSize);
      }, RESEARCH_CONFIG.maxBodySize);

      const duration = Date.now() - startTime;

      return {
        prospectId,
        url,
        finalUrl,
        title: title.trim(),
        metaDescription: metaDescription.trim(),
        headings,
        bodyText,
        internalLinks,
        images,
        extractedAt: new Date().toISOString(),
        duration,
        httpStatus,
      };
    } finally {
      // Ensure page and context are properly closed to avoid leaks
      await page.close();
      await context.close();
    }
  }
}

export const playwrightService = PlaywrightService.getInstance();
export default playwrightService;
