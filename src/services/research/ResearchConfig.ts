export const RESEARCH_CONFIG = {
  timeout: 45000,          // 45 seconds per page
  maxBodySize: 150000,     // 150k characters per page
  maxLinks: 100,           // maximum internal links to extract
  maxImages: 30,           // maximum image assets to extract
  headless: true,          // launch Playwright chromium in headless mode
  
  // Intelligent Crawler Settings
  maxPages: 25,            // crawl up to 25 pages per domain
  maxDepth: 3,             // max recursion depth
  parallelWorkers: 4,      // 4 parallel worker loaders
  minContentSize: 50,      // minimum characters of body text to store
  retryCount: 2,           // network retry counts
  priorityKeywords: [
    'about', 'services', 'products', 'pricing', 'solutions', 'industries', 
    'case-studies', 'customers', 'blog', 'news', 'contact', 'careers', 
    'team', 'technology', 'ai', 'automation', 'integrations', 'features',
    'platform', 'company', 'about-us', 'what-we-do', 'how-it-works'
  ],
  ignoredPaths: [
    'login', 'signin', 'signup', 'register', 'account', 'cart', 'checkout', 
    'privacy-policy', 'terms-of-service', 'terms', 'privacy', 'legal'
  ]
};

export default RESEARCH_CONFIG;
