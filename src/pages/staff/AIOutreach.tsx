import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, RefreshCw, AlertCircle, Loader, Plus, X, Info } from 'lucide-react';
import UploadZone from '../../components/staff/UploadZone';
import PasteInput from '../../components/staff/PasteInput';
import QueueDashboard from '../../components/staff/QueueDashboard';
import { QueueItem } from '../../services/queue/QueueTypes';
import { queueManager } from '../../services/queue/QueueManager';
import { queueStore } from '../../services/queue/QueueStore';
import { researchStore } from '../../services/research/ResearchStore';
import { analysisStore } from '../../services/analysis/AnalysisStore';
import { emailStore } from '../../services/email/EmailStore';
import { gmailStore } from '../../services/gmail/GmailStore';
import { campaignService } from '../../services/campaign/CampaignService';
import { campaignStore } from '../../services/campaign/CampaignStore';
import { Campaign } from '../../services/campaign/CampaignTypes';
import { ParsingError, ParseResult } from '../../types/prospect';

export default function AIOutreach() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [errors, setErrors] = useState<ParsingError[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);

  // Campaigns integration states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [inlineDescription, setInlineDescription] = useState('');

  // Sync state with the queue store and queue manager singleton
  useEffect(() => {
    const initializeStores = async () => {
      try {
        setLoadingStores(true);
        // Load persistent entries in parallel from Supabase
        await Promise.allSettled([
          queueStore.loadFromSupabase(),
          researchStore.loadFromSupabase(),
          analysisStore.loadFromSupabase(),
          emailStore.loadFromSupabase(),
          gmailStore.loadFromSupabase(),
          campaignService.list(),
        ]);
        
        setQueueItems(queueManager.getQueue());
        
        // Auto-resolve dynamic sources names if items exist
        const items = queueManager.getQueue();
        if (items.length > 0) {
          setSourceName('Persistent Storage Cache');
        }

        // Set campaigns list state and select first active if any
        const camps = campaignStore.getAll();
        setCampaigns(camps);
        if (camps.length > 0) {
          setSelectedCampaignId(camps[0].id);
        }
      } catch (err) {
        console.warn('Failed to prefetch Supabase records, operating in responsive memory mode:', err);
      } finally {
        setLoadingStores(false);
      }
    };

    initializeStores();

    setIsRunning(queueManager.getIsRunning());
    setIsPaused(queueManager.getIsPaused());

    // Subscribe to store updates
    const unsubscribeStore = queueStore.subscribe(() => {
      setQueueItems(queueManager.getQueue());
    });

    const unsubscribeCampaigns = campaignStore.subscribe(() => {
      setCampaigns(campaignStore.getAll());
    });

    // Subscribe to manager running state updates
    const unsubStarted = queueManager.on('queue_started', () => {
      setIsRunning(true);
      setIsPaused(false);
    });
    const unsubPaused = queueManager.on('queue_paused', () => {
      setIsPaused(true);
    });
    const unsubResumed = queueManager.on('queue_resumed', () => {
      setIsPaused(false);
    });
    const unsubFinished = queueManager.on('queue_finished', () => {
      setIsRunning(false);
      setIsPaused(false);
    });

    return () => {
      unsubscribeStore();
      unsubscribeCampaigns();
      unsubStarted();
      unsubPaused();
      unsubResumed();
      unsubFinished();
    };
  }, []);

  const handleParsed = (result: ParseResult, name?: string) => {
    if (!selectedCampaignId) {
      setErrorMessage('Please select or create a campaign first.');
      return;
    }
    if (result.prospects.length === 0) {
      setErrorMessage('No valid prospects found in the uploaded file.');
      return;
    }
    
    // Inject selected campaignId to parsed prospects
    const linked = result.prospects.map(p => ({
      ...p,
      campaignId: selectedCampaignId,
    }));

    // Push parsed prospects into the queue manager
    queueManager.enqueueMany(linked);
    setErrors(result.errors);
    setSourceName(name || 'Pasted text stream');
    setErrorMessage(null);
  };

  const handleCreateCampaignInline = async () => {
    if (!inlineName.trim()) return;
    try {
      const camp = await campaignService.create({
        name: inlineName,
        description: inlineDescription,
        status: 'Draft',
      });
      setCampaigns(campaignStore.getAll());
      setSelectedCampaignId(camp.id);
      setInlineName('');
      setInlineDescription('');
      setShowCreateInline(false);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to create campaign inline:', err);
      setErrorMessage(err?.message || 'Failed to create campaign');
    }
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
  };

  const handleClear = () => {
    queueStore.clear();
    setErrors([]);
    setSourceName(null);
    setErrorMessage(null);
  };

  if (loadingStores) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs text-gray-500 font-mono">Synchronizing workspace state with Supabase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="font-syne font-bold text-2xl text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" /> AI Outreach - Queue Dashboard
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Persisted workspace with secure Google OAuth connections and local Ollama pipelines.
          </p>
        </div>
        {queueItems.length > 0 && (
          <div className="text-xs font-mono text-gray-500 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl self-start md:self-auto flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <span>Active Source: <strong className="text-white font-medium">{sourceName}</strong></span>
          </div>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Primary Workflow Layout */}
      {queueItems.length === 0 ? (
        <div className="bg-[#121212] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl">
          {/* Campaign Selection Bar */}
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5">Active Outreach Campaign</label>
                {campaigns.length === 0 ? (
                  <p className="text-xs text-amber-400 font-semibold">No campaigns available. Create one to enable importing.</p>
                ) : (
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="bg-[#121212] border border-white/5 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-emerald-500/30"
                  >
                    <option value="" disabled>-- Select Campaign --</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowCreateInline(!showCreateInline)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                {showCreateInline ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showCreateInline ? 'Cancel Inline Creation' : 'Create New Campaign'}
              </button>
            </div>

            {/* Inline campaign creation form */}
            {showCreateInline && (
              <div className="bg-[#121212] p-4 rounded-xl border border-white/5 space-y-3 max-w-sm">
                <p className="text-white font-semibold text-xs">Create New Campaign</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Campaign Name"
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-gray-600"
                  />
                  <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={inlineDescription}
                    onChange={(e) => setInlineDescription(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-gray-600"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCampaignInline}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                  >
                    Save &amp; Select Campaign
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Subnavigation Tabs */}
          <div className="flex border-b border-white/5 pb-3 gap-6 text-sm font-semibold">
            <button
              onClick={() => {
                setActiveTab('upload');
                setErrorMessage(null);
              }}
              className={`pb-3 focus:outline-none transition-all relative ${
                activeTab === 'upload'
                  ? 'text-emerald-400'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Upload Spreadsheet
              {activeTab === 'upload' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('paste');
                setErrorMessage(null);
              }}
              className={`pb-3 focus:outline-none transition-all relative ${
                activeTab === 'paste'
                  ? 'text-emerald-400'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Paste Raw Data
              {activeTab === 'paste' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Render Tab Contents */}
          <div className="pt-2">
            {!selectedCampaignId ? (
              <div className="text-center py-8 text-gray-500 text-sm bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                <Info className="w-6 h-6 mx-auto mb-2 text-amber-400/80" />
                <p className="font-semibold text-white">Active Campaign Required</p>
                <p className="text-xs mt-1">Select an existing campaign or create a new one above to activate importing.</p>
              </div>
            ) : (
              activeTab === 'upload' ? (
                <div className="space-y-4">
                  <div className="max-w-xl">
                    <h3 className="text-white font-semibold text-lg">Load CSV or Excel Spreadsheet</h3>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                      Upload your raw client data files. The system will automatically map the headers and validate columns for company names, websites, and emails.
                    </p>
                  </div>
                  <UploadZone onParsed={(res, file) => handleParsed(res, file)} onError={handleError} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-w-xl">
                    <h3 className="text-white font-semibold text-lg">Paste Tab-Separated Values</h3>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                      Copy cells directly from Excel, Google Sheets, or CSV editors and paste them. The parsing system handles blank lines and normalizes URL/email arrays dynamically.
                    </p>
                  </div>
                  <PasteInput onParsed={handleParsed} onError={handleError} />
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        /* Render Live Queue Dashboard Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">Active Worker Pipeline Dashboard</h3>
              <p className="text-gray-500 text-xs mt-0.5">Monitor worker status stages and execution updates.</p>
            </div>
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-emerald-400 font-mono transition-colors flex items-center gap-1.5 border border-white/5 hover:border-emerald-500/20 bg-white/[0.01] hover:bg-emerald-500/5 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start Over
            </button>
          </div>
          <QueueDashboard
            items={queueItems}
            errors={errors}
            onClear={handleClear}
            isRunning={isRunning}
            isPaused={isPaused}
          />
        </div>
      )}
    </div>
  );
}
