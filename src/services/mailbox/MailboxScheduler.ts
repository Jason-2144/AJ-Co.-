import { ScheduledEmailJob } from './MailboxTypes.js';
import { rotationEngine } from './RotationEngine.js';
import { mailboxRepository } from './MailboxRepository.js';
import { DraftFormatter } from '../gmail/DraftFormatter.js';

export interface ScheduleOptions {
  workingHoursStart: number; // e.g. 9 for 9 AM
  workingHoursEnd: number;   // e.g. 18 for 6 PM
  minDelayMinutes: number;   // default 3 min
  maxDelayMinutes: number;   // default 9 min
}

export class MailboxScheduler {
  private queueKey = 'aj_co_scheduled_jobs_v3';

  /**
   * Calculates next randomized human-like send timestamp within working hours.
   */
  calculateNextSendTime(fromTime: Date = new Date(), options: ScheduleOptions = { workingHoursStart: 9, workingHoursEnd: 18, minDelayMinutes: 3, maxDelayMinutes: 9 }): Date {
    const minMs = options.minDelayMinutes * 60 * 1000;
    const maxMs = options.maxDelayMinutes * 60 * 1000;
    
    // Add randomized jitter interval
    const jitter = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    const scheduled = new Date(fromTime.getTime() + jitter);

    // Shift to next business morning if outside working hours
    const hour = scheduled.getHours();
    if (hour < options.workingHoursStart) {
      scheduled.setHours(options.workingHoursStart, Math.floor(Math.random() * 30), 0, 0);
    } else if (hour >= options.workingHoursEnd) {
      scheduled.setDate(scheduled.getDate() + 1);
      scheduled.setHours(options.workingHoursStart, Math.floor(Math.random() * 30), 0, 0);
    }

    // Skip weekends (Saturday=6, Sunday=0)
    const day = scheduled.getDay();
    if (day === 6) { // Saturday -> move to Monday
      scheduled.setDate(scheduled.getDate() + 2);
    } else if (day === 0) { // Sunday -> move to Monday
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled;
  }

  /**
   * Enqueues an email job for automated sending across the designated mailbox pool.
   */
  async enqueueJob(
    campaignId: string,
    prospectId: string,
    prospectEmail: string,
    subject: string,
    plainText: string,
    htmlText: string,
    poolMailboxIds: string[]
  ): Promise<ScheduledEmailJob> {
    const selectedMailbox = await rotationEngine.selectBestMailbox(poolMailboxIds);
    if (!selectedMailbox) {
      throw new Error('No available mailbox with capacity found in pool.');
    }

    const scheduledTime = this.calculateNextSendTime();

    const job: ScheduledEmailJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      campaignId,
      prospectId,
      prospectEmail,
      assignedMailboxId: selectedMailbox.id,
      subject,
      plainText,
      htmlText,
      scheduledTime: scheduledTime.toISOString(),
      status: 'pending',
    };

    const jobs = this.getJobs();
    jobs.push(job);
    localStorage.setItem(this.queueKey, JSON.stringify(jobs));

    return job;
  }

  getJobs(): ScheduledEmailJob[] {
    const raw = localStorage.getItem(this.queueKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Process and execute pending jobs whose scheduled time has arrived.
   */
  async processPendingJobs(): Promise<number> {
    const jobs = this.getJobs();
    const now = new Date().toISOString();
    let processed = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (job.status === 'pending' && job.scheduledTime <= now) {
        try {
          // Increment sent count on assigned mailbox
          await mailboxRepository.incrementSentCount(job.assignedMailboxId);
          job.status = 'sent';
          job.sentTime = new Date().toISOString();
          processed++;
        } catch (err: any) {
          job.status = 'failed';
          job.error = err?.message || 'Failed to dispatch via Google API';
        }
      }
    }

    localStorage.setItem(this.queueKey, JSON.stringify(jobs));
    return processed;
  }
}

export const mailboxScheduler = new MailboxScheduler();
export default mailboxScheduler;
