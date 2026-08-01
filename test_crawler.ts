import { ResearchCrawler } from './src/services/research/ResearchCrawler';
const crawler = new ResearchCrawler();
crawler.crawl('test', 'https://perspectai.com').then(res => {
    console.log("SUCCESS!", res.length);
    console.log(res);
}).catch(console.error);
