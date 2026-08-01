import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, AlertCircle, Loader, RefreshCw, Check } from 'lucide-react';
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
import { gmailService } from '../../services/gmail/GmailService';
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
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');

  // Sync state with the queue store and queue manager singleton
  useEffect(() => {
    const initializeStores = async () => {
      try {
        setLoadingStores(true);
        // Load persistent entries in parallel from Supabase
        const [statusRes] = await Promise.allSettled([
          queueStore.loadFromSupabase(),
          researchStore.loadFromSupabase(),
          analysisStore.loadFromSupabase(),
          emailStore.loadFromSupabase(),
          gmailStore.loadFromSupabase(),
        ]);

        try {
          const gStatus = await gmailService.getStatus();
          setGmailConnected(!!gStatus.isAuthenticated);
          if (gStatus.email) setGmailEmail(gStatus.email);
        } catch (e) {}
        
        setQueueItems(queueManager.getQueue());
        
        // Auto-resolve dynamic sources names if items exist
        const items = queueManager.getQueue();
        if (items.length > 0) {
          setSourceName('Persistent Storage Cache');
        }
      } catch (err) {
        console.warn('Failed to prefetch Supabase records:', err);
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
      unsubStarted();
      unsubPaused();
      unsubResumed();
      unsubFinished();
    };
  }, []);

  const handleParsed = (result: ParseResult, name?: string) => {
    if (result.prospects.length === 0) {
      setErrorMessage('No valid prospects found in the uploaded file.');
      return;
    }

    // Push parsed prospects directly into the queue manager
    queueManager.enqueueMany(result.prospects);
    setErrors(result.errors);
    setSourceName(name || 'Pasted text stream');
    setErrorMessage(null);
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
        <p className="text-xs text-gray-500 font-mono">Synchronizing workspace state...</p>
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
        <div className="flex items-center gap-3">
          {!gmailConnected ? (
            <button
              onClick={async () => {
                try {
                  const url = await gmailService.getAuthUrl();
                  window.location.href = url;
                } catch (e) {
                  console.error(e);
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Connect Google Workspace / Gmail
            </button>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono px-3 py-1.5 rounded-xl flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span>Gmail Connected: <strong className="text-white font-medium">{gmailEmail || 'Google Workspace'}</strong></span>
            </div>
          )}
          {queueItems.length > 0 && (
            <div className="text-xs font-mono text-gray-500 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>Active Source: <strong className="text-white font-medium">{sourceName}</strong></span>
            </div>
          )}
        </div>
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
            {activeTab === 'upload' ? (
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
