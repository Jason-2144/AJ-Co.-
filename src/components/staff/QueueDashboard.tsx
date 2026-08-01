import React, { useState, useEffect } from 'react';
import { QueueItem } from '../../services/queue/QueueTypes';
import { queueManager } from '../../services/queue/QueueManager';
import { queueStore } from '../../services/queue/QueueStore';
import { ParsingError } from '../../types/prospect';
import { ProspectStatus } from '../../types/prospect';
import { researchStore } from '../../services/research/ResearchStore';
import { WebsiteResearch } from '../../services/research/ResearchTypes';
import { analysisStore } from '../../services/analysis/AnalysisStore';
import { CompanyAnalysis } from '../../services/analysis/AnalysisTypes';
import { emailStore } from '../../services/email/EmailStore';
import { GeneratedEmail } from '../../services/email/EmailTypes';
import { emailService } from '../../services/email/EmailService';
import { gmailStore } from '../../services/gmail/GmailStore';
import { gmailService } from '../../services/gmail/GmailService';
import { GmailDraftRecord } from '../../services/gmail/GmailTypes';
import { 
  Play, Pause, RotateCcw, AlertTriangle, Trash2, XCircle, Eye, 
  Search, ChevronLeft, ChevronRight, CheckCircle, Info, ExternalLink, X,
  FileSearch, Copy, Check, BarChart2, Globe, Brain, Cpu, ShieldAlert, Sparkles,
  Mail, Send, RefreshCw, Layers, ToggleLeft, ToggleRight, Link, Link2, AlertOctagon, Clock
} from 'lucide-react';

interface QueueDashboardProps {
  items: QueueItem[];
  errors: ParsingError[];
  onClear: () => void;
  isRunning: boolean;
  isPaused: boolean;
}

export default function QueueDashboard({ items, errors, onClear, isRunning, isPaused }: QueueDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [selectedResearch, setSelectedResearch] = useState<WebsiteResearch | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CompanyAnalysis | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GeneratedEmail | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  
  const [researchStoreVersion, setResearchStoreVersion] = useState(0);
  const [analysisStoreVersion, setAnalysisStoreVersion] = useState(0);
  const [emailStoreVersion, setEmailStoreVersion] = useState(0);
  const [gmailStoreVersion, setGmailStoreVersion] = useState(0);
  
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  
  const [gmailStatus, setGmailStatus] = useState<{ isAuthenticated: boolean; email?: string; mockMode?: boolean } | null>(null);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Subscribe to all stores to update metrics dynamically
  useEffect(() => {
    const unsubResearch = researchStore.subscribe(() => {
      setResearchStoreVersion((v) => v + 1);
    });
    const unsubAnalysis = analysisStore.subscribe(() => {
      setAnalysisStoreVersion((v) => v + 1);
    });
    const unsubEmail = emailStore.subscribe(() => {
      setEmailStoreVersion((v) => v + 1);
    });
    const unsubGmail = gmailStore.subscribe(() => {
      setGmailStoreVersion((v) => v + 1);
    });
    return () => {
      unsubResearch();
      unsubAnalysis();
      unsubEmail();
      unsubGmail();
    };
  }, []);

  // Check backend Google OAuth Status on mount and changes
  useEffect(() => {
    const fetchGmailStatus = async () => {
      try {
        const status = await gmailService.getStatus();
        setGmailStatus(status);
      } catch (e) {
        console.error('Failed to retrieve Google Auth status:', e);
      }
    };
    fetchGmailStatus();
  }, [gmailStoreVersion]);

  // Filter items
  const filteredItems = items.filter((item) => {
    const p = item.prospect;
    const searchString = `${p.company} ${p.city || ''} ${p.state || ''} ${item.status} ${item.currentStage}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Helper: Format timestamp as HH:MM:SS
  const formatTime = (ts?: number): string => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  // Helper: Format stage names
  const formatStage = (stage: ProspectStatus): string => {
    if (stage === ProspectStatus.queued) return 'Queued';
    if (stage === ProspectStatus.completed) return 'Completed';
    if (stage === ProspectStatus.failed) return 'Failed';
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  // Core Queue Metrics
  const queuedCount = items.filter((i) => i.status === ProspectStatus.queued).length;
  const runningCount = items.filter((i) => 
    [ProspectStatus.researching, ProspectStatus.analysing, ProspectStatus.generating, ProspectStatus.drafting].includes(i.status)
  ).length;
  const completedCount = items.filter((i) => i.status === ProspectStatus.completed).length;
  const failedCount = items.filter((i) => i.status === ProspectStatus.failed).length;

  // Average processing time for completed queue items
  const completedItems = items.filter((i) => i.status === ProspectStatus.completed && i.startedAt && i.finishedAt);
  const avgTime = completedItems.length > 0
    ? completedItems.reduce((acc, curr) => acc + (curr.finishedAt! - curr.startedAt!), 0) / completedItems.length / 1000
    : 0;

  // Total overall queue progress
  const totalProgress = items.length > 0
    ? Math.round(items.reduce((acc, curr) => acc + curr.progress, 0) / items.length)
    : 0;

  // ==========================================
  // RESEARCH METRICS CALCULATIONS
  // ==========================================
  const researchRecords = researchStore.getAll();
  const totalResearchDuration = researchRecords.reduce((acc, curr) => acc + curr.duration, 0);
  const avgResearchTime = researchRecords.length > 0 ? (totalResearchDuration / researchRecords.length) / 1000 : 0;

  const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const totalWordsExtracted = researchRecords.reduce((acc, curr) => acc + countWords(curr.bodyText), 0);

  const attemptedResearchItems = items.filter((i) => i.startedAt && i.prospect.website);
  const researchSuccessRate = attemptedResearchItems.length > 0
    ? Math.round((researchRecords.length / attemptedResearchItems.length) * 100)
    : 0;

  // ==========================================
  // AI ANALYSIS METRICS CALCULATIONS
  // ==========================================
  const analyses = analysisStore.getAll();
  const totalAiDuration = analyses.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const avgAiResponseTime = analyses.length > 0 ? (totalAiDuration / analyses.length) / 1000 : 0;

  const totalConfidence = analyses.reduce((acc, curr) => acc + curr.confidence, 0);
  const avgConfidence = analyses.length > 0 ? Math.round(totalConfidence / analyses.length) : 0;

  const analysedCount = analyses.length;

  const industryCounts: Record<string, number> = {};
  analyses.forEach((a) => {
    const rawInd = (a.industry || 'Unknown').trim();
    if (rawInd && rawInd.toLowerCase() !== 'unknown') {
      const normalizedInd = rawInd.charAt(0).toUpperCase() + rawInd.slice(1).toLowerCase();
      industryCounts[normalizedInd] = (industryCounts[normalizedInd] || 0) + 1;
    }
  });
  const sortedIndustries = Object.entries(industryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name, count]) => `${name} (${count})`)
    .join(', ');
  const topIndustryDistribution = sortedIndustries || 'None';

  // ==========================================
  // AI EMAIL OUTREACH METRICS CALCULATIONS
  // ==========================================
  const emails = emailStore.getAll();
  const generatedEmailsCount = emails.length;

  const getEmailWordCount = (e: GeneratedEmail): number => {
    const text = `${e.opening || ''} ${e.body || ''} ${e.cta || ''} ${e.signature || ''}`;
    return text.split(/\s+/).filter(Boolean).length;
  };
  const totalEmailWords = emails.reduce((acc, curr) => acc + getEmailWordCount(curr), 0);
  const avgEmailLength = emails.length > 0 ? Math.round(totalEmailWords / emails.length) : 0;

  const totalEmailConfidence = emails.reduce((acc, curr) => acc + curr.confidence, 0);
  const avgEmailConfidence = emails.length > 0 ? Math.round(totalEmailConfidence / emails.length) : 0;

  const totalEmailDuration = emails.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const avgEmailDuration = emails.length > 0 ? (totalEmailDuration / emails.length) / 1000 : 0;

  // ==========================================
  // GMAIL DRAFT WORKFLOW METRICS CALCULATIONS
  // ==========================================
  const drafts = gmailStore.getAll();
  const totalDraftsCreated = drafts.filter((d) => d.status === 'created').length;
  const totalDraftFailures = drafts.filter((d) => d.status === 'failed').length;
  const totalDraftsPending = drafts.filter((d) => d.status === 'pending').length;
  
  const draftAttemptedCount = totalDraftsCreated + totalDraftFailures;
  const draftSuccessRate = draftAttemptedCount > 0
    ? Math.round((totalDraftsCreated / draftAttemptedCount) * 100)
    : 0;

  // ==========================================
  // SHARED WORKSPACE METRICS (CALCULATED FROM TODAY)
  // ==========================================
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayTime = startOfToday.getTime();

  const processedTodayCount = items.filter(
    (i) => i.status === ProspectStatus.completed && i.finishedAt && i.finishedAt >= startOfTodayTime
  ).length;

  const emailsGeneratedTodayCount = emails.filter(
    (e) => e.generatedAt && new Date(e.generatedAt).getTime() >= startOfTodayTime
  ).length;

  // Auth connection handler
  const handleConnectGmail = async () => {
    try {
      const url = await gmailService.getAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to fetch redirect Auth URL:', err);
    }
  };

  // Manual Draft trigger
  const handleCreateDraftManually = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const email = emailStore.getEmail(itemId);
    if (!item || !email) {
      setDraftError('Missing prospect metadata or email copy to build draft.');
      return;
    }
    setDraftingId(itemId);
    setDraftError(null);
    try {
      await gmailService.createDraft(item.prospect, email);
    } catch (error: any) {
      setDraftError(error?.message || 'Failed to create draft in your Google account.');
    } finally {
      setDraftingId(null);
    }
  };

  const handleCopyLink = (text: string, prospectId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(prospectId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Action copies
  const handleCopyBody = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAnalysis = (analysisObj: CompanyAnalysis) => {
    navigator.clipboard.writeText(JSON.stringify(analysisObj, null, 2));
    setCopiedAnalysis(true);
    setTimeout(() => setCopiedAnalysis(false), 2000);
  };

  const handleCopyEmailFull = (e: GeneratedEmail) => {
    const fullText = `Subject: ${e.subject}\nPreview: ${e.preview}\n\n${e.opening}\n\n${e.body}\n\n${e.cta}\n\n${e.signature}`;
    navigator.clipboard.writeText(fullText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleRegenerateEmail = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const analysis = analysisStore.getAnalysis(itemId);
    if (!item || !analysis) {
      setRegenerateError('Missing prospect or analysis context for email regeneration.');
      return;
    }
    setRegeneratingId(itemId);
    setRegenerateError(null);
    try {
      const freshEmail = await emailService.runGeneration(itemId, analysis, item.prospect);
      setSelectedEmail(freshEmail);
    } catch (err: any) {
      setRegenerateError(err?.message || 'Failed to regenerate email.');
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Statistics Cards (Queue, Scraper, AI Analysis, AI Email, Gmail Drafts) */}
      <div className="space-y-4">
        {/* Core Queue Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Queued</span>
            <p className="text-xl font-bold text-gray-300 mt-1">{queuedCount}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Running</span>
            <p className="text-xl font-bold text-amber-400 mt-1 animate-pulse">{runningCount}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Completed</span>
            <p className="text-xl font-bold text-emerald-400 mt-1">{completedCount}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Failed</span>
            <p className="text-xl font-bold text-red-400 mt-1">{failedCount}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center col-span-2 md:col-span-1">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Avg Time</span>
            <p className="text-xl font-bold text-blue-400 mt-1">{avgTime.toFixed(1)}s</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center col-span-2 md:col-span-1">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Total Progress</span>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-xl font-bold text-emerald-400">{totalProgress}%</span>
              <div className="w-10 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${totalProgress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Scraper Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Average Research Time</span>
              <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">{avgResearchTime.toFixed(2)}s</p>
            </div>
            <Globe className="w-6 h-6 text-emerald-500/20 shrink-0" />
          </div>

          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Total Words Extracted</span>
              <p className="text-lg font-bold text-blue-400 mt-1 font-mono">{totalWordsExtracted.toLocaleString()} words</p>
            </div>
            <BarChart2 className="w-6 h-6 text-blue-500/20 shrink-0" />
          </div>

          <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Research Success %</span>
              <p className="text-lg font-bold text-amber-400 mt-1 font-mono">{researchSuccessRate}%</p>
            </div>
            <CheckCircle className="w-6 h-6 text-amber-500/20 shrink-0" />
          </div>
        </div>

        {/* Tertiary AI Intelligence Stats & AI Outreach Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Analysis Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#121212]/50 border border-white/5 p-4 rounded-2xl">
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">AI Analysed</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">{analysedCount}</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Avg Anal Time</span>
              <p className="text-lg font-bold text-blue-400 mt-0.5 font-mono">{avgAiResponseTime.toFixed(1)}s</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Avg Confidence</span>
              <p className="text-lg font-bold text-amber-400 mt-0.5 font-mono">{avgConfidence}%</p>
            </div>
            <div className="col-span-2 sm:col-span-1 text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Top Industries</span>
              <p className="text-[10px] font-semibold text-white mt-0.5 truncate max-w-[100px] font-mono">{topIndustryDistribution}</p>
            </div>
          </div>

          {/* Email Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#121212]/50 border border-white/5 p-4 rounded-2xl">
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Generated Emails</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">{generatedEmailsCount}</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Avg Email Words</span>
              <p className="text-lg font-bold text-blue-400 mt-0.5 font-mono">{avgEmailLength}</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Avg Gen Time</span>
              <p className="text-lg font-bold text-amber-400 mt-0.5 font-mono">{avgEmailDuration.toFixed(1)}s</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Email Confidence</span>
              <p className="text-lg font-bold text-purple-400 mt-0.5 font-mono">{avgEmailConfidence}%</p>
            </div>
          </div>
        </div>

        {/* Gmail Draft Workflow Statistics Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#121212] border border-white/5 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-emerald-400/20 shrink-0" />
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Drafts Created</span>
              <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">{totalDraftsCreated}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400/20 shrink-0" />
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Draft Failures</span>
              <p className="text-base font-bold text-red-400 font-mono mt-0.5">{totalDraftFailures}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-500/20 shrink-0" />
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Pending Drafts</span>
              <p className="text-base font-bold text-gray-400 font-mono mt-0.5">{totalDraftsPending}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-amber-400/20 shrink-0" />
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Draft Success Rate</span>
              <p className="text-base font-bold text-amber-400 font-mono mt-0.5">{draftSuccessRate}%</p>
            </div>
          </div>
        </div>

        {/* Shared Workspace Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#121212] border border-white/5 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Processed Today (Shared)</span>
              <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">{processedTodayCount} companies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Mail className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Emails Generated Today (Shared)</span>
              <p className="text-base font-bold text-purple-400 font-mono mt-0.5">{emailsGeneratedTodayCount} messages</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Send className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Outreach Sent (Shared)</span>
              <p className="text-base font-bold text-blue-400 font-mono mt-0.5">N/A (Drafts Only)</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Controls & Actions */}
      <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Queue Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isRunning ? (
            <button
              onClick={() => queueManager.start()}
              disabled={items.length === 0 || queuedCount === 0}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/20 disabled:text-emerald-500/40 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Start Queue
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={() => queueManager.resume()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
              ) : (
                <button
                  onClick={() => queueManager.pause()}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              )}
            </>
          )}
          
          <button
            onClick={() => queueManager.clearCompleted()}
            disabled={completedCount === 0}
            className="border border-white/5 hover:bg-white/5 disabled:opacity-30 text-white px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            Clear Completed
          </button>
          <button
            onClick={() => queueManager.clearFailed()}
            disabled={failedCount === 0}
            className="border border-white/5 hover:bg-white/5 disabled:opacity-30 text-white px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            Clear Failed
          </button>
        </div>

        {/* Approval Setting / Auto Draft Switch */}
        <div className="flex items-center gap-2 bg-[#1A1A1A] border border-white/5 px-3 py-1.5 rounded-xl">
          <span className="text-[10px] font-mono text-gray-400">Automatic Draft Creation</span>
          <button
            onClick={() => {
              gmailStore.setAutoDraft(!gmailStore.isAutoDraft());
              setGmailStoreVersion(v => v + 1);
            }}
            className="text-gray-300 hover:text-white transition-colors cursor-pointer"
            title={gmailStore.isAutoDraft() ? 'Disable automatic Gmail drafts' : 'Enable automatic Gmail drafts'}
          >
            {gmailStore.isAutoDraft() ? (
              <ToggleRight className="w-6 h-6 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-gray-500" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search items..."
            className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none placeholder-gray-600"
          />
        </div>

        {/* Global Reset */}
        <button
          onClick={() => {
            researchStore.clear();
            analysisStore.clear();
            emailStore.clear();
            gmailStore.clear();
            onClear();
          }}
          className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
        >
          Clear Queue Store
        </button>
      </div>

      {/* 3. Live Queue Grid Table */}
      <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 bg-[#181818] text-gray-400 font-mono uppercase">
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Draft Status</th>
                <th className="px-6 py-4 font-semibold">Current Stage</th>
                <th className="px-6 py-4 font-semibold" style={{ width: '160px' }}>Progress</th>
                <th className="px-6 py-4 font-semibold text-center">Started</th>
                <th className="px-6 py-4 font-semibold text-center">Finished</th>
                <th className="px-6 py-4 font-semibold text-center">Retries</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {paginatedItems.map((item) => {
                const isItemRunning = [
                  ProspectStatus.researching,
                  ProspectStatus.analysing,
                  ProspectStatus.generating,
                  ProspectStatus.drafting
                ].includes(item.status);

                const hasResearch = researchStore.getResearch(item.id) !== undefined;
                const hasAnalysis = analysisStore.getAnalysis(item.id) !== undefined;
                const hasEmail = emailStore.getEmail(item.id) !== undefined;
                
                const draftRecord = gmailStore.getDraft(item.id);

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-white/[0.01] transition-colors ${
                      isItemRunning ? 'bg-amber-500/[0.01]' : ''
                    }`}
                  >
                    {/* Company */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">{item.prospect.company}</span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                        item.status === ProspectStatus.completed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : item.status === ProspectStatus.failed
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : isItemRunning
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                          : 'bg-white/[0.02] text-gray-400 border-white/5'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Gmail Draft Status Cell */}
                    <td className="px-6 py-4 text-center">
                      {draftRecord ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                            draftRecord.status === 'created'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : draftRecord.status === 'failed'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }`}>
                            {draftRecord.status}
                          </span>
                          
                          {/* Errors Tooltip Icon */}
                          {draftRecord.status === 'failed' && (
                            <span className="text-red-400 cursor-help" title={draftRecord.lastError}>
                              <AlertOctagon className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 font-mono text-[9px]">Pending</span>
                      )}
                    </td>

                    {/* Current Stage */}
                    <td className="px-6 py-4 font-medium text-gray-400">
                      {formatStage(item.currentStage)}
                    </td>

                    {/* Progress Bar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-gray-500 shrink-0 w-8">{item.progress}%</span>
                        <div className="flex-grow bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              item.status === ProspectStatus.completed
                                ? 'bg-emerald-500'
                                : item.status === ProspectStatus.failed
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Started Time */}
                    <td className="px-6 py-4 text-center font-mono text-gray-500">
                      {formatTime(item.startedAt)}
                    </td>

                    {/* Finished Time */}
                    <td className="px-6 py-4 text-center font-mono text-gray-500">
                      {formatTime(item.finishedAt)}
                    </td>

                    {/* Retry Count */}
                    <td className="px-6 py-4 text-center font-mono font-semibold">
                      {item.retryCount}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {/* Manual Create / Retry Draft trigger */}
                        {hasEmail && (!draftRecord || draftRecord.status === 'failed') && (
                          <button
                            onClick={() => handleCreateDraftManually(item.id)}
                            disabled={draftingId === item.id || !gmailStatus?.isAuthenticated}
                            className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 disabled:opacity-20 rounded-lg transition-colors cursor-pointer"
                            title={gmailStatus?.isAuthenticated ? 'Create Gmail Draft' : 'Link Google Account first'}
                          >
                            <Send className={`w-3.5 h-3.5 ${draftingId === item.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        {/* Copy Link trigger */}
                        {draftRecord?.status === 'created' && (
                          <button
                            onClick={() => handleCopyLink('https://mail.google.com/mail/u/0/#drafts', item.id)}
                            className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                            title="Copy Gmail Drafts Link"
                          >
                            {copiedLink === item.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <ExternalLink className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* View Email Action */}
                        <button
                          onClick={() => {
                            const e = emailStore.getEmail(item.id);
                            if (e) {
                              setSelectedEmail(e);
                              setRegenerateError(null);
                            }
                          }}
                          disabled={!hasEmail}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            hasEmail 
                              ? 'hover:bg-purple-500/10 text-purple-400' 
                              : 'text-gray-700 opacity-20 cursor-not-allowed'
                          }`}
                          title={hasEmail ? 'View AI Outreach Email' : 'Email template unavailable'}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* View Analysis Action */}
                        <button
                          onClick={() => {
                            const ans = analysisStore.getAnalysis(item.id);
                            if (ans) setSelectedAnalysis(ans);
                          }}
                          disabled={!hasAnalysis}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            hasAnalysis 
                              ? 'hover:bg-amber-500/10 text-amber-400' 
                              : 'text-gray-700 opacity-20 cursor-not-allowed'
                          }`}
                          title={hasAnalysis ? 'View AI Analysis' : 'AI Analysis unavailable'}
                        >
                          <Brain className="w-3.5 h-3.5" />
                        </button>

                        {/* View Research Action */}
                        <button
                          onClick={() => {
                            const res = researchStore.getResearch(item.id);
                            if (res) setSelectedResearch(res);
                          }}
                          disabled={!hasResearch}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            hasResearch 
                              ? 'hover:bg-emerald-500/10 text-emerald-400' 
                              : 'text-gray-700 opacity-20 cursor-not-allowed'
                          }`}
                          title={hasResearch ? 'View Site Research' : 'Research data unavailable'}
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => queueManager.retry(item.id)}
                          disabled={item.status !== ProspectStatus.failed}
                          className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 disabled:opacity-20 rounded-lg transition-colors cursor-pointer"
                          title="Retry"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => queueManager.cancel(item.id)}
                          disabled={item.status !== ProspectStatus.queued && !isItemRunning}
                          className="p-1.5 hover:bg-red-500/10 text-red-400 disabled:opacity-20 rounded-lg transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => queueStore.removeItem(item.id)}
                          disabled={isItemRunning}
                          className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 disabled:opacity-20 rounded-lg transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500 font-mono">
                    No active queue items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-[#181818] px-6 py-4">
            <span className="text-[10px] text-gray-500 font-mono">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1 bg-[#121212] border border-white/10 hover:border-emerald-500/30 text-white rounded-lg disabled:opacity-30 disabled:hover:border-white/10 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-white font-mono px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1 bg-[#121212] border border-white/10 hover:border-emerald-500/30 text-white rounded-lg disabled:opacity-30 disabled:hover:border-white/10 transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Validation Log Panel */}
      {errors.length > 0 && (
        <div className="border border-amber-500/10 bg-amber-500/[0.01] p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold text-xs text-white">Import Warnings Log ({errors.length})</span>
          </div>
          <div className="max-h-32 overflow-y-auto text-[10px] font-mono text-gray-400 space-y-1">
            {errors.map((err, idx) => (
              <div key={idx} className="bg-amber-500/[0.02] border border-white/5 p-2 rounded">
                Row {err.row}: {err.errors.join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. View Details Modal Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-syne font-bold text-lg text-white">Prospect Pipeline Audit</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block font-mono">Company</span>
                  <span className="font-semibold text-white mt-1 block">{selectedItem.prospect.company}</span>
                </div>
                <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block font-mono">Status State</span>
                  <span className="font-mono font-semibold text-amber-400 mt-1 block capitalize">{selectedItem.status}</span>
                </div>
              </div>

              {/* Progress & Error banner */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-gray-400">
                  <span>Pipeline Progress</span>
                  <span>{selectedItem.progress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2" style={{ width: `${selectedItem.progress}%` }} />
                </div>
              </div>

              {selectedItem.error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-mono flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error Output:</span>
                    <p className="mt-1 leading-relaxed">{selectedItem.error}</p>
                  </div>
                </div>
              )}

              {/* Attributes Section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-400 border-b border-white/5 pb-1">
                  Metadata Values
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block">Website</span>
                    {selectedItem.prospect.website ? (
                      <a
                        href={selectedItem.prospect.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {selectedItem.prospect.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block">Location</span>
                    <span className="text-white block mt-0.5">
                      {selectedItem.prospect.city || '—'}
                      {selectedItem.prospect.city && selectedItem.prospect.state ? ', ' : ''}
                      {selectedItem.prospect.state || ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-2">
                  <div>
                    <span className="text-gray-500 block">Started At</span>
                    <span className="text-white block mt-0.5">{selectedItem.startedAt ? new Date(selectedItem.startedAt).toLocaleString() : '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Finished At</span>
                    <span className="text-white block mt-0.5">{selectedItem.finishedAt ? new Date(selectedItem.finishedAt).toLocaleString() : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Lists Section */}
              <div className="space-y-4">
                {/* Contacts Badges */}
                <div className="space-y-2">
                  <span className="text-xs text-gray-500 font-mono block">Contacts Array ({selectedItem.prospect.contacts.length})</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.prospect.contacts.map((c, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-xs font-mono text-gray-300">
                        {c}
                      </span>
                    ))}
                    {selectedItem.prospect.contacts.length === 0 && <span className="text-xs text-gray-600 italic">No contact entries</span>}
                  </div>
                </div>

                {/* Emails Badges */}
                <div className="space-y-2">
                  <span className="text-xs text-gray-500 font-mono block">Emails Array ({selectedItem.prospect.emails.length})</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.prospect.emails.map((e, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-xs font-mono text-gray-300">
                        {e}
                      </span>
                    ))}
                    {selectedItem.prospect.emails.length === 0 && <span className="text-xs text-gray-600 italic">No email entries</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. View Research Modal Overlay */}
      {selectedResearch && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <h3 className="font-syne font-bold text-lg text-white">Website Scraper Research Output</h3>
              </div>
              <button
                onClick={() => setSelectedResearch(null)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Meta metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Word Count</span>
                  <span className="text-white font-bold text-sm mt-0.5 block">{countWords(selectedResearch.bodyText)}</span>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Internal Links</span>
                  <span className="text-white font-bold text-sm mt-0.5 block">{selectedResearch.internalLinks.length}</span>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Images Found</span>
                  <span className="text-white font-bold text-sm mt-0.5 block">{selectedResearch.images.length}</span>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Crawl Duration</span>
                  <span className="text-white font-bold text-sm mt-0.5 block">{(selectedResearch.duration / 1000).toFixed(2)}s</span>
                </div>
              </div>

              {/* Intelligent Crawler Session Metrics */}
              {selectedResearch.pagesCrawled !== undefined && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-emerald-500/[0.02] p-3 rounded-lg border border-emerald-500/10 text-emerald-400">
                    <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Pages Crawled</span>
                    <span className="font-bold text-xs mt-0.5 block">{selectedResearch.pagesCrawled} pages</span>
                  </div>
                  <div className="bg-emerald-500/[0.02] p-3 rounded-lg border border-emerald-500/10 text-emerald-400">
                    <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Total Scraped Size</span>
                    <span className="font-bold text-xs mt-0.5 block">{(selectedResearch.totalSizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="bg-emerald-500/[0.02] p-3 rounded-lg border border-emerald-500/10 text-emerald-400">
                    <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Crawl Version</span>
                    <span className="font-bold text-xs mt-0.5 block">v{selectedResearch.version}</span>
                  </div>
                  <div className="bg-emerald-500/[0.02] p-3 rounded-lg border border-emerald-500/10 text-emerald-400">
                    <span className="text-gray-500 block text-[9px] uppercase tracking-wider">AI Confidence</span>
                    <span className="font-bold text-xs mt-0.5 block">{selectedResearch.confidenceScore}%</span>
                  </div>
                </div>
              )}

              {/* Visited Pages Expandable List */}
              {selectedResearch.pages && selectedResearch.pages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-400 border-b border-white/5 pb-1 font-mono">
                    Visited Pages Log ({selectedResearch.pages.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedResearch.pages.map((p, idx) => (
                      <div key={idx} className="bg-white/[0.01] border border-white/5 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-white font-medium break-all block">{p.url}</span>
                          <span className="text-[9px] text-gray-500 font-mono">
                            Crawled At: {new Date(p.crawledAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] self-start sm:self-auto">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            p.statusCode === 200 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {p.statusCode}
                          </span>
                          <span className="text-gray-400">{p.loadTimeMs}ms</span>
                          <span className="text-gray-500">{(p.contentLength / 1024).toFixed(1)} KB</span>
                        </div>
                        {p.screenshotPath && (
                          <div className="mt-2 sm:mt-0 max-w-[120px]">
                            <span className="text-red-400 font-semibold block text-[9px] mb-1">Crawl Fail Screenshot:</span>
                            <img src={p.screenshotPath} alt="Error screenshot" className="w-24 rounded border border-white/5 max-h-16 object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Preprocessed Website Profile Summary */}
              {selectedResearch.researchSummary && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-400 border-b border-white/5 pb-1 font-mono">
                    AI Preprocessed Website Profile Summary
                  </h4>
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl max-w-none text-xs leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap text-emerald-300">
                    {selectedResearch.researchSummary}
                  </div>
                </div>
              )}

              {/* URL information */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Target URLs</span>
                <div className="text-xs font-mono text-gray-400 space-y-1 bg-white/[0.01] border border-white/5 p-3 rounded-lg break-all">
                  <p><span className="text-gray-600">Original:</span> {selectedResearch.url}</p>
                  <p><span className="text-gray-600">Post-Redirects:</span> {selectedResearch.finalUrl}</p>
                </div>
              </div>

              {/* Header Title & Description */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-400 border-b border-white/5 pb-1 font-mono">
                  Site Meta Info
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500 block font-mono">Page Title</span>
                    <p className="text-white font-medium">{selectedResearch.title || <span className="text-gray-600 italic">No title found</span>}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block font-mono">Meta Description</span>
                    <p className="text-gray-300 leading-relaxed text-xs">
                      {selectedResearch.metaDescription || <span className="text-gray-600 italic">No description meta tag found</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Headings */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-400 border-b border-white/5 pb-1 font-mono">
                  Extracted Headings (H1 & H2) ({selectedResearch.headings.length})
                </h4>
                {selectedResearch.headings.length > 0 ? (
                  <div className="max-h-24 overflow-y-auto pr-2 text-xs font-mono bg-white/[0.01] border border-white/5 p-3 rounded-lg space-y-1 text-gray-400">
                    {selectedResearch.headings.map((h, hIdx) => (
                      <p key={hIdx} className="truncate"><span className="text-emerald-500/40 font-bold font-sans">#</span> {h}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">No headings found</p>
                )}
              </div>

              {/* Body Text Content */}
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-white/5 pb-1">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-400 font-mono">
                    Clean Readable Body Text
                  </h4>
                  <button
                    onClick={() => handleCopyBody(selectedResearch.bodyText)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Body
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-lg p-4 max-h-48 overflow-y-auto text-xs font-sans text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedResearch.bodyText || <span className="text-gray-600 italic">No visible body text extracted</span>}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-[#181818]">
              <span className="text-[10px] text-gray-500 font-mono">
                Extracted: {new Date(selectedResearch.extractedAt).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyBody(JSON.stringify(selectedResearch, null, 2))}
                  className="border border-white/5 hover:bg-white/5 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Copy Raw JSON
                </button>
                <button
                  onClick={() => setSelectedResearch(null)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. View Analysis Modal Overlay */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-amber-400" />
                <h3 className="font-syne font-bold text-lg text-white font-mono">Ollama Business Analysis</h3>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Top stats block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-mono">
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Primary Industry</span>
                  <span className="text-white font-bold text-xs mt-0.5 block truncate">{selectedAnalysis.industry}</span>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Business Model</span>
                  <span className="text-white font-bold text-xs mt-0.5 block truncate">{selectedAnalysis.businessModel}</span>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">AI Confidence Score</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-amber-400 font-bold text-xs">{selectedAnalysis.confidence}%</span>
                    <div className="w-8 bg-gray-800 rounded-full h-1 overflow-hidden">
                      <div className="bg-amber-400 h-1" style={{ width: `${selectedAnalysis.confidence}%` }} />
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Query Response Time</span>
                  <span className="text-white font-bold text-xs mt-0.5 block font-mono">{(selectedAnalysis.duration / 1000).toFixed(2)}s</span>
                </div>
              </div>

              {/* Company Summary */}
              <div className="space-y-1 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Executive Summary</span>
                <p className="text-gray-200 leading-relaxed text-xs">{selectedAnalysis.companySummary}</p>
              </div>

              {/* Target ICP */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Ideal Customer Profile (ICP)</span>
                <p className="text-gray-300 leading-relaxed font-sans">{selectedAnalysis.targetCustomers}</p>
              </div>

              {/* Products, Services, Stack lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-500 font-mono uppercase block">Extracted Products</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAnalysis.products.map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white/[0.03] border border-white/5 rounded text-[10px] text-gray-300 font-mono">
                        {p}
                      </span>
                    ))}
                    {selectedAnalysis.products.length === 0 && <span className="text-gray-600 italic">None</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-gray-500 font-mono uppercase block">Services Offered</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAnalysis.services.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white/[0.03] border border-white/5 rounded text-[10px] text-gray-300 font-mono">
                        {s}
                      </span>
                    ))}
                    {selectedAnalysis.services.length === 0 && <span className="text-gray-600 italic">None</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-gray-500 font-mono uppercase block">Tech Stack</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAnalysis.technologies.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white/[0.03] border border-white/5 rounded text-[10px] text-gray-300 font-mono">
                        {t}
                      </span>
                    ))}
                    {selectedAnalysis.technologies.length === 0 && <span className="text-gray-600 italic">None</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-gray-500 font-mono uppercase block">Identified Business Pain Points</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-400 text-[11px] font-sans">
                    {selectedAnalysis.painPoints.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                    {selectedAnalysis.painPoints.length === 0 && <li className="text-gray-600 italic">None</li>}
                  </ul>
                </div>
              </div>

              {/* AI Automation Opportunities */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Recommended AI Opportunities</span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {selectedAnalysis.aiOpportunities.map((op, opIdx) => (
                    <div key={opIdx} className="bg-white/[0.02] border border-white/5 p-3 rounded-lg flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="font-semibold text-white font-sans text-xs">{op.title}</span>
                        <p className="text-gray-400 leading-relaxed font-sans text-[11px]">{op.description}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border uppercase ${
                        op.estimatedImpact?.toLowerCase() === 'high'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : op.estimatedImpact?.toLowerCase() === 'medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-white/[0.02] text-gray-400 border-white/5'
                      }`}>
                        {op.estimatedImpact || 'Medium'}
                      </span>
                    </div>
                  ))}
                  {selectedAnalysis.aiOpportunities.length === 0 && <p className="text-gray-600 italic">None</p>}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-[#181818]">
              <span className="text-[10px] text-gray-500 font-mono">
                Extracted: {new Date(selectedAnalysis.generatedAt).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyAnalysis(selectedAnalysis)}
                  className="text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 px-4 py-2 rounded-xl text-xs transition-all cursor-pointer font-semibold"
                >
                  {copiedAnalysis ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied JSON!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Analysis JSON
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. View Outreach Email & Gmail Draft Modal Overlay */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-400" />
                <h3 className="font-syne font-bold text-lg text-white font-mono">AI Outreach Copywriter</h3>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Top stats block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-mono">
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Email Word Count</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">{getEmailWordCount(selectedEmail)} words</span>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">AI Confidence Score</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-purple-400 font-bold text-xs">{selectedEmail.confidence}%</span>
                    <div className="w-8 bg-gray-800 rounded-full h-1 overflow-hidden">
                      <div className="bg-purple-400 h-1" style={{ width: `${selectedEmail.confidence}%` }} />
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Target Opportunities</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">{selectedEmail.opportunities.length} custom points</span>
                </div>
                <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <span className="text-gray-500 block">Generation Duration</span>
                  <span className="text-white font-bold text-xs mt-0.5 block font-mono">{((selectedEmail.duration || 0) / 1000).toFixed(2)}s</span>
                </div>
              </div>

              {/* Gmail Draft Audit Info Block (Unified in modal) */}
              {gmailStore.getDraft(selectedEmail.prospectId) && (
                <div className={`p-4 rounded-xl border space-y-1 ${
                  gmailStore.getDraft(selectedEmail.prospectId)?.status === 'created'
                    ? 'bg-emerald-500/[0.02] border-emerald-500/10'
                    : 'bg-red-500/[0.02] border-red-500/10'
                }`}>
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Gmail Draft Status Details</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                    <p><span className="text-gray-600">Status:</span> <span className="font-bold capitalize text-white">{gmailStore.getDraft(selectedEmail.prospectId)?.status}</span></p>
                    {gmailStore.getDraft(selectedEmail.prospectId)?.draftId && (
                      <p><span className="text-gray-600">Draft ID:</span> <span className="text-gray-300 break-all">{gmailStore.getDraft(selectedEmail.prospectId)?.draftId}</span></p>
                    )}
                    {gmailStore.getDraft(selectedEmail.prospectId)?.createdTime && (
                      <p><span className="text-gray-600">Created At:</span> <span className="text-gray-300">{new Date(gmailStore.getDraft(selectedEmail.prospectId)!.createdTime!).toLocaleString()}</span></p>
                    )}
                    {gmailStore.getDraft(selectedEmail.prospectId)?.lastError && (
                      <p className="md:col-span-2 text-red-400 font-semibold"><span className="text-gray-600">Error:</span> {gmailStore.getDraft(selectedEmail.prospectId)?.lastError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error box if regeneration fails */}
              {(regenerateError || draftError) && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg font-mono text-[11px] leading-relaxed">
                  {regenerateError || draftError}
                </div>
              )}

              {/* Subject & Preview headers */}
              <div className="space-y-1.5 bg-white/[0.01] border border-white/5 p-4 rounded-xl font-mono text-[11px]">
                <p><span className="text-gray-500">Subject Line:</span> <span className="text-white font-semibold">{selectedEmail.subject}</span></p>
                <p><span className="text-gray-500">Preview Text:</span> <span className="text-gray-300">{selectedEmail.preview}</span></p>
              </div>

              {/* Email Content Composer view */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Body Copy Output</span>
                <div className="bg-white/[0.01] border border-white/5 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-[11px] text-gray-200 leading-relaxed whitespace-pre-wrap">
                  <p>{selectedEmail.opening}</p>
                  <br />
                  <p>{selectedEmail.body}</p>
                  <br />
                  <p>{selectedEmail.cta}</p>
                  <br />
                  <p>{selectedEmail.signature}</p>
                </div>
              </div>

              {/* 3 custom opportunities breakdown */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Targeted Opportunities Breakdown</span>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {selectedEmail.opportunities.map((op, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 p-3 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                        <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 px-1.5 rounded">{idx + 1}</span>
                        <span className="text-xs font-sans">{op.title}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-gray-400 font-sans pt-1">
                        <div>
                          <span className="text-[9px] text-gray-600 block uppercase font-mono">Problem</span>
                          <span className="leading-relaxed">{op.problem}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-600 block uppercase font-mono">Suggested Automation</span>
                          <span className="leading-relaxed text-gray-300">{op.solution}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-600 block uppercase font-mono">Business Benefit</span>
                          <span className="leading-relaxed text-emerald-400">{op.benefit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-[#181818] flex-wrap gap-2">
              <span className="text-[10px] text-gray-500 font-mono">
                Compiled: {new Date(selectedEmail.generatedAt).toLocaleString()}
              </span>
              <div className="flex gap-2">
                {/* 1-Click Open Draft in Gmail button */}
                <a
                  href={gmailStore.getDraft(selectedEmail.prospectId)?.composeUrl || `https://mail.google.com/mail/?view=cm&fs=1&to=contact@client.com&su=${encodeURIComponent(selectedEmail.subject)}&body=${encodeURIComponent(selectedEmail.opening + '\n\n' + selectedEmail.body + '\n\n' + selectedEmail.cta + '\n\n' + selectedEmail.signature)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Draft in Gmail
                </a>

                {/* Regenerate Button */}
                <button
                  onClick={() => handleRegenerateEmail(selectedEmail.prospectId)}
                  disabled={regeneratingId === selectedEmail.prospectId}
                  className="border border-white/10 hover:bg-white/5 hover:border-emerald-500/30 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === selectedEmail.prospectId ? 'animate-spin text-emerald-400' : ''}`} />
                  {regeneratingId === selectedEmail.prospectId ? 'Generating...' : 'Regenerate Email'}
                </button>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopyEmailFull(selectedEmail)}
                  className="border border-white/5 hover:bg-white/5 text-white font-mono flex items-center gap-1 px-4 py-2 rounded-xl text-xs transition-all cursor-pointer font-semibold"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Email Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
