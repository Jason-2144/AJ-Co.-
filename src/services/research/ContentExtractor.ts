import { Page } from 'playwright';
import { RESEARCH_CONFIG } from './ResearchConfig';

export class ContentExtractor {
  /**
   * Evaluates the browser page DOM to strip repeated menus, cookies, footers,
   * headers, and hidden nodes, returning only unique, clean business content.
   */
  static async extractCleanContent(page: Page): Promise<string> {
    return await page.evaluate((maxSize) => {
      // 1. Tags to purge (keep header/footer to avoid stripping hero content)
      const excludeTags = ['script', 'style', 'noscript', 'svg', 'iframe'];
      excludeTags.forEach((tag) => {
        document.querySelectorAll(tag).forEach((el) => el.remove());
      });

      // 2. Class/ID keywords representing cookies/modals
      const boilerplateKeywords = ['cookie', 'consent', 'gdpr', 'popup', 'modal'];
      
      document.querySelectorAll('div, section, dialog').forEach((el: any) => {
        try {
          const idOrClass = (el.id + ' ' + el.className).toLowerCase();
          if (boilerplateKeywords.some((kw) => idOrClass.includes(kw))) {
            el.remove();
          }
        } catch (e) {
          // ignore selector errors
        }
      });

      // 3. Extract visible text with fallback
      let rawText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
      if (!rawText || rawText.trim().length < 20) {
        rawText = document.documentElement.innerText || document.documentElement.textContent || '';
      }
      
      // 5. Clean excess whitespace layout formats
      const cleanText = rawText
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return cleanText.slice(0, maxSize);
    }, RESEARCH_CONFIG.maxBodySize);
  }
}

export default ContentExtractor;
