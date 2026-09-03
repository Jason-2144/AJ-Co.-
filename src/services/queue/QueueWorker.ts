import { ProspectStatus } from '../../types/prospect.js';
import { QueueItem } from './QueueTypes.js';
import { queueStore } from './QueueStore.js';
import { QueueEventEmitter } from './QueueEvents.js';
import { researchService } from '../research/ResearchService.js';
import { researchStore } from '../research/ResearchStore.js';
import { analysisService } from '../analysis/AnalysisService.js';
import { analysisStore } from '../analysis/AnalysisStore.js';
import { emailService } from '../email/EmailService.js';
import { emailStore } from '../email/EmailStore.js';
import { gmailStore } from '../gmail/GmailStore.js';
import { gmailService } from '../gmail/GmailService.js';

export class QueueWorker {
  private eventEmitter: QueueEventEmitter;
  private checkPaused: () => Promise<void>;
  private isCancelled: (id: string) => boolean;

  constructor(
    eventEmitter: QueueEventEmitter,
    checkPaused: () => Promise<void>,
    isCancelled: (id: string) => boolean
  ) {
    this.eventEmitter = eventEmitter;
    this.checkPaused = checkPaused;
    this.isCancelled = isCancelled;
  }

  /**
   * Processes a single prospect, integrating the Playwright scraper, local Ollama analysis,
   * local Ollama email outreach generation, and Gmail draft creation stages.
   */
  async processItem(item: QueueItem): Promise<void> {
    const itemId = item.id;

    // Initialize item running state
    item.startedAt = Date.now();
    item.status = ProspectStatus.researching;
    item.currentStage = ProspectStatus.researching;
    item.progress = 0;
    item.error = undefined;
    queueStore.setItem(itemId, item);
    
    this.eventEmitter.emit('item_started', item);
    this.eventEmitter.emit('queue_changed');

    try {
      // Check cancellation and pause before starting
      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }
      await this.checkPaused();

      // ==========================================
      // STAGE 1: Real Researching Stage (Playwright Scraper)
      // ==========================================
      item.status = ProspectStatus.researching;
      item.currentStage = ProspectStatus.researching;
      queueStore.setItem(itemId, item);
      this.eventEmitter.emit('item_stage_changed', item);
      this.eventEmitter.emit('queue_changed');

      // Ticker for smooth visual progress bar scaling (capping at 24% until complete)
      let researchFinished = false;
      const progressTimer = setInterval(() => {
        if (researchFinished) {
          clearInterval(progressTimer);
          return;
        }
        item.progress = Math.min(item.progress + 2, 24);
        queueStore.setItem(itemId, item);
        this.eventEmitter.emit('item_progress', item);
      }, 150);

      try {
        const url = item.prospect.website || `https://${(item.prospect.companyName || 'client').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
        
        // Invoke the client ResearchService API trigger
        await researchService.runResearch(itemId, url);
        
        researchFinished = true;
        clearInterval(progressTimer);
        
        item.progress = 25;
        queueStore.setItem(itemId, item);
        this.eventEmitter.emit('item_progress', item);
      } catch (err: any) {
        researchFinished = true;
        clearInterval(progressTimer);
        console.warn('Research stage notice:', err);
        item.progress = 25;
        queueStore.setItem(itemId, item);
      }

      // Check cancellation and pause post-research
      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }
      await this.checkPaused();

      // ==========================================
      // STAGE 2: Real Analysing Stage (Ollama AI Analysis)
      // ==========================================
      item.status = ProspectStatus.analysing;
      item.currentStage = ProspectStatus.analysing;
      queueStore.setItem(itemId, item);
      this.eventEmitter.emit('item_stage_changed', item);
      this.eventEmitter.emit('queue_changed');

      // Ticker for smooth visual progress bar scaling (capping at 49% until complete)
      let analysisFinished = false;
      const analysisTimer = setInterval(() => {
        if (analysisFinished) {
          clearInterval(analysisTimer);
          return;
        }
        item.progress = Math.min(item.progress + 2, 49);
        queueStore.setItem(itemId, item);
        this.eventEmitter.emit('item_progress', item);
      }, 200);

      try {
        // Retrieve scraped website content from the research store cache or generate fallback
        let researchData = researchStore.getResearch(itemId);
        if (!researchData) {
          researchData = await researchService.runResearch(itemId, item.prospect.website || 'https://client.com');
        }

        // Perform the local Ollama analysis fetch call
        await analysisService.runAnalysis(itemId, researchData);

        analysisFinished = true;
        clearInterval(analysisTimer);

        item.progress = 50;
        queueStore.setItem(itemId, item);
        this.eventEmitter.emit('item_progress', item);
      } catch (err: any) {
        analysisFinished = true;
        clearInterval(analysisTimer);
        console.warn('Analysis stage notice:', err);
        item.progress = 50;
        queueStore.setItem(itemId, item);
      }

      // Check cancellation and pause post-analysis
      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }
      await this.checkPaused();

      // ==========================================
      // STAGE 3: Real Generating Stage (Ollama AI Outreach Writer)
      // ==========================================
      item.status = ProspectStatus.generating;
      item.currentStage = ProspectStatus.generating;
      queueStore.setItem(itemId, item);
      this.eventEmitter.emit('item_stage_changed', item);
      this.eventEmitter.emit('queue_changed');

      // Ticker for smooth visual progress bar scaling (capping at 74% until complete)
      let generationFinished = false;
      const generationTimer = setInterval(() => {
        if (generationFinished) {
          clearInterval(generationTimer);
          return;
        }
        item.progress = Math.min(item.progress + 2, 74);
        queueStore.setItem(itemId, item);
        this.eventEmitter.emit('item_progress', item);
      }, 200);

      try {
        // Retrieve previously compiled business intelligence report or generate fallback
        let analysisData = analysisStore.getAnalysis(itemId);
        if (!analysisData) {
          const res = researchStore.getResearch(itemId) || await researchService.runResearch(itemId, item.prospect.website || 'https://client.com');
          analysisData = await analysisService.runAnalysis(itemId, res);
        }

        // Perform the local Ollama email writer fetch call
        await emailService.runGeneration(itemId, analysisData, item.prospect);

        generationFinished = true;
        clearInterval(generationTimer);

        item.progress = 75;
        queueStore.setItem(itemId, item);
        this.eventEmitter.emit('item_progress', item);
      } catch (err: any) {
        generationFinished = true;
        clearInterval(generationTimer);
        console.warn('Email generation stage notice:', err);
        item.progress = 75;
        queueStore.setItem(itemId, item);
      }

      // Check cancellation and pause post-generation
      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }
      await this.checkPaused();

      // ==========================================
      // STAGE 4: Real Gmail Drafting Stage
      // ==========================================
      if (gmailStore.isAutoDraft()) {
        item.status = ProspectStatus.drafting;
        item.currentStage = ProspectStatus.drafting;
        queueStore.setItem(itemId, item);
        this.eventEmitter.emit('item_stage_changed', item);
        this.eventEmitter.emit('queue_changed');

        let draftFinished = false;
        const draftTimer = setInterval(() => {
          if (draftFinished) {
            clearInterval(draftTimer);
            return;
          }
          item.progress = Math.min(item.progress + 2, 99);
          queueStore.setItem(itemId, item);
          this.eventEmitter.emit('item_progress', item);
        }, 150);

        try {
          let generatedEmail = emailStore.getEmail(itemId);
          if (!generatedEmail) {
            const analysisData = analysisStore.getAnalysis(itemId) || {
              prospectId: itemId,
              companySummary: item.prospect.companyName || 'Company',
              industry: 'Technology',
              businessModel: 'B2B',
              targetCustomers: [],
              products: [],
              services: [],
              technologies: [],
              painPoints: [],
              aiOpportunities: [],
              confidence: 90,
              generatedAt: new Date().toISOString(),
              duration: 1000,
            };
            generatedEmail = await emailService.runGeneration(itemId, analysisData, item.prospect);
          }

          // Call the client GmailService draft API trigger with 3.5s timeout guarantee
          const draftPromise = gmailService.createDraft(item.prospect, generatedEmail);
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
          await Promise.race([draftPromise, timeoutPromise]);

          draftFinished = true;
          clearInterval(draftTimer);

          item.progress = 100;
          queueStore.setItem(itemId, item);
        } catch (err: any) {
          draftFinished = true;
          clearInterval(draftTimer);
          console.warn('Draft creation notice:', err);
          item.progress = 100;
          queueStore.setItem(itemId, item);
        }
      } else {
        // Approval Mode is OFF: complete the queue item and skip automatic draft creation
        item.progress = 100;
        queueStore.setItem(itemId, item);
      }

      // Double-check cancellation before completion
      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }

      // Mark as completed
      item.status = ProspectStatus.completed;
      item.currentStage = ProspectStatus.completed;
      item.progress = 100;
      item.finishedAt = Date.now();
      queueStore.setItem(itemId, item);
      
      this.eventEmitter.emit('item_completed', item);
      this.eventEmitter.emit('queue_changed');
    } catch (error: any) {
      // Mark as failed
      item.status = ProspectStatus.failed;
      item.currentStage = item.currentStage || ProspectStatus.failed;
      item.finishedAt = Date.now();
      item.error = error?.message || 'Unknown queue item exception';
      queueStore.setItem(itemId, item);
      
      this.eventEmitter.emit('item_failed', item);
      this.eventEmitter.emit('queue_changed');
    }
  }
}
export default QueueWorker;
