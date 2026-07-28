export const RESEARCH_CONFIG = {
  timeout: 30000,          // 30 seconds
  maxBodySize: 50000,      // characters
  maxLinks: 50,            // maximum internal links to extract
  maxImages: 20,           // maximum image assets to extract
  headless: true,          // launch Playwright chromium in headless mode
  
  // Intelligent Crawler Settings
  maxPages: 10,            // default max pages to crawl
  maxDepth: 2,             // max recursion depth
  parallelWorkers: 2,      // parallel worker loaders
  minContentSize: 100,     // minimum characters of body text to store
  retryCount: 2,           // network retry counts
  priorityKeywords: [
    'about', 'services', 'products', 'pricing', 'solutions', 'industries', 
    'case-studies', 'customers', 'blog', 'news', 'contact', 'careers', 
    'team', 'technology', 'ai', 'automation', 'integrations'
  ],
  ignoredPaths: [
    'login', 'signin', 'signup', 'register', 'account', 'cart', 'checkout', 
    'privacy-policy', 'terms-of-service', 'terms', 'privacy', 'legal'
  ]
};

export default RESEARCH_CONFIG;
