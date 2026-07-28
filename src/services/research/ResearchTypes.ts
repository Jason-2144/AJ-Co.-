export interface VisitedPage {
  id?: string;
  url: string;
  statusCode: number;
  loadTimeMs: number;
  contentLength: number;
  cleanedContent: string;
  screenshotPath?: string;
  crawledAt: string;
}

export interface WebsiteResearch {
  prospectId: string;
  url: string;
  finalUrl: string;
  title: string;
  metaDescription: string;
  headings: string[];
  bodyText: string; // Combined main body text for fallback compatibility
  internalLinks: string[];
  images: {
    src: string;
    alt: string;
  }[];
  extractedAt: string; // ISO date string
  duration: number; // in milliseconds
  
  // Extended intelligent crawler fields
  pagesCrawled: number;
  totalSizeBytes: number;
  version: number;
  lastCrawlTime: string;
  pages: VisitedPage[];
  researchSummary: string; // LLM preprocessed output sent to business analysis
  confidenceScore: number;
}
