import { RESEARCH_CONFIG } from './ResearchConfig';

export class PageScorer {
  /**
   * Filter, score, and prioritize a list of URLs found on a page.
   * Returns a sorted list of absolute URLs with their scores.
   */
  static scoreLinks(links: string[], currentUrl: string): { url: string; score: number }[] {
    let hostname = '';
    try {
      hostname = new URL(currentUrl).hostname.replace('www.', '');
    } catch (e) {
      return [];
    }

    const uniqueLinks = Array.from(new Set(links));

    return uniqueLinks
      .map((link) => {
        try {
          const urlObj = new URL(link);
          
          // 1. Clean hash/query params
          urlObj.hash = '';
          const cleanedUrl = urlObj.toString();

          // 2. Validate internal links only
          const linkHostname = urlObj.hostname.replace('www.', '');
          if (linkHostname !== hostname) {
            return null;
          }

          // 3. Skip media, doc, and download assets
          const path = urlObj.pathname.toLowerCase();
          const forbiddenExtensions = [
            '.pdf', '.zip', '.dmg', '.exe', '.tar', '.gz', '.mp4', '.mp3', 
            '.jpg', '.png', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.css', '.js'
          ];
          if (forbiddenExtensions.some((ext) => path.endsWith(ext))) {
            return null;
          }

          // 4. Score based on priority keywords
          let score = 0;
          
          // Check for ignored paths
          if (RESEARCH_CONFIG.ignoredPaths.some((ignored) => path.includes(ignored))) {
            score -= 20;
          }

          // Check for priority paths
          RESEARCH_CONFIG.priorityKeywords.forEach((keyword) => {
            if (path.includes(keyword)) {
              if (['about', 'products', 'services', 'pricing', 'solutions'].includes(keyword)) {
                score += 10;
              } else {
                score += 5;
              }
            }
          });

          // Short path bonus (usually links like /about or /pricing are shorter)
          const segments = path.split('/').filter(Boolean);
          if (segments.length === 1) {
            score += 2;
          }

          return { url: cleanedUrl, score };
        } catch (err) {
          return null;
        }
      })
      .filter((item): item is { url: string; score: number } => item !== null && item.score >= -10)
      .sort((a, b) => b.score - a.score);
  }
}

export default PageScorer;
