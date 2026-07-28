import { Page } from 'playwright';
import { RESEARCH_CONFIG } from './ResearchConfig';

export class ContentExtractor {
  /**
   * Evaluates the browser page DOM to strip repeated menus, cookies, footers,
   * headers, and hidden nodes, returning only unique, clean business content.
   */
  static async extractCleanContent(page: Page): Promise<string> {
    return await page.evaluate((maxSize) => {
      // 1. Tags to purge entirely
      const excludeTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'header', 'footer', 'nav', 'aside'];
      excludeTags.forEach((tag) => {
        document.querySelectorAll(tag).forEach((el) => el.remove());
      });

      // 2. Class/ID keywords representing boilerplate, menus, cookies, widgets
      const boilerplateKeywords = [
        'menu', 'nav', 'header', 'footer', 'cookie', 'consent', 'gdpr', 'banner', 
        'privacy-policy', 'terms', 'social', 'widget', 'sidebar', 'popup', 'modal'
      ];
      
      document.querySelectorAll('div, section, dialog, ul, ol').forEach((el: any) => {
        try {
          const idOrClass = (el.id + ' ' + el.className).toLowerCase();
          if (boilerplateKeywords.some((kw) => idOrClass.includes(kw))) {
            el.remove();
          }
        } catch (e) {
          // ignore selector errors
        }
      });

      // 3. Purge hidden nodes
      document.querySelectorAll('*').forEach((el: any) => {
        try {
          const style = window.getComputedStyle(el);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            el.offsetWidth === 0 ||
            el.offsetHeight === 0
          ) {
            el.remove();
          }
        } catch (e) {
          // ignore computing style errors
        }
      });

      // 4. Extract visible body text
      const rawText = document.body.innerText || document.body.textContent || '';
      
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
