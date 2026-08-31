import React, { useState, useEffect } from 'react';
import { MessageCircle, FileText, AlertCircle, Loader, RefreshCw, Send, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import PatientUploadZone from '../../components/staff/PatientUploadZone';
import PatientPasteInput from '../../components/staff/PatientPasteInput';
import ReengagementDashboard from '../../components/staff/ReengagementDashboard';
import { ReengagementItem } from '../../services/patients/PatientTypes';
import { PatientParseResult, PatientParsingError } from '../../services/patients/PatientTypes';
import { reengagementManager } from '../../services/reengagement/ReengagementManager';
import { reengagementStore } from '../../services/reengagement/ReengagementStore';
import { whatsAppService } from '../../services/whatsapp/WhatsAppService';
import { whatsAppStore } from '../../services/whatsapp/WhatsAppStore';

const WA_GREEN = '#25D366';

export default function PatientReengagement() {
  const [items, setItems] = useState<ReengagementItem[]>([]);
  const [errors, setErrors] = useState<PatientParsingError[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const [waStatus, setWaStatus] = useState<{ mockMode: boolean; fromNumber: string; provider?: string; hasApprovedTemplate?: boolean } | null>(null);
  const [pingOpen, setPingOpen] = useState(false);
  const [pingPhone, setPingPhone] = useState('');
  const [pingSending, setPingSending] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoadingStores(true);
        await Promise.allSettled([
          reengagementStore.loadFromSupabase(),
          whatsAppStore.loadFromSupabase(),
        ]);

        try {
          const status = await whatsAppService.getStatus();
          setWaStatus(status);
        } catch (e) {
          console.warn('Failed to fetch WhatsApp connection status:', e);
        }

        const currentItems = reengagementManager.getQueue();
        setItems(currentItems);
        if (currentItems.length > 0) {
          setSourceName('Persistent Storage Cache');
        }
      } finally {
        setLoadingStores(false);
      }
    };

    initialize();

    setIsRunning(reengagementManager.getIsRunning());
    setIsPaused(reengagementManager.getIsPaused());

    const unsubscribeStore = reengagementStore.subscribe(() => {
      setItems(reengagementManager.getQueue());
    });
    const unsubStarted = reengagementManager.on('queue_started', () => {
      setIsRunning(true);
      setIsPaused(false);
    });
    const unsubPaused = reengagementManager.on('queue_paused', () => setIsPaused(true));
    const unsubResumed = reengagementManager.on('queue_resumed', () => setIsPaused(false));
    const unsubFinished = reengagementManager.on('queue_finished', () => {
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

  const handleParsed = (result: PatientParseResult, name?: string) => {
    if (result.patients.length === 0) {
      setErrorMessage('No valid patients found in the uploaded data.');
      return;
    }

    reengagementManager.enqueueMany(result.patients);
    setErrors(result.errors);
    setSourceName(name || 'Pasted text stream');
    setErrorMessage(null);
  };

  const handleError = (message: string) => setErrorMessage(message);

  const handleSendPing = async () => {
    if (!pingPhone.trim()) return;
    setPingSending(true);
    setPingResult(null);
    try {
      await whatsAppService.sendTestPing(pingPhone.trim());
      setPingResult({ ok: true, message: `Sent — check WhatsApp on ${pingPhone.trim()}.` });
    } catch (err: any) {
      setPingResult({ ok: false, message: err?.message || 'Failed to send test message.' });
    } finally {
      setPingSending(false);
    }
  };

  const handleClear = () => {
    reengagementStore.clear();
    whatsAppStore.clear();
    setErrors([]);
    setSourceName(null);
    setErrorMessage(null);
  };

  const isLive = !!waStatus && !waStatus.mockMode && !!waStatus.hasApprovedTemplate;

  if (loadingStores) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader className="w-8 h-8 animate-spin" style={{ color: WA_GREEN }} />
        <p className="text-xs text-gray-500 font-mono">Synchronizing workspace state...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0d1f16] via-[#0A0A0A] to-[#08151d] p-6 sm:p-8 shadow-2xl">
        <div
          className="absolute -top-24 -right-16 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${WA_GREEN}33, transparent 70%)` }}
        />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-cyan-500/10 blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-widest text-gray-300 mb-4">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isLive ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: isLive ? WA_GREEN : '#f59e0b' }}
              />
              {isLive ? 'Agent Live' : 'Awaiting Setup'} · {waStatus?.provider || '—'}
            </div>
            <h1 className="font-syne font-bold text-3xl sm:text-4xl text-white tracking-tight flex items-center gap-3">
              Patient Re-Engagement
              <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: WA_GREEN }} strokeWidth={2.2} />
            </h1>
            <p className="text-gray-400 text-sm mt-2 max-w-xl leading-relaxed">
              Upload the patients who've gone quiet. The agent writes a personal nudge for each one and sends it straight to their WhatsApp — no copy-pasting, no manual sending.
            </p>
          </div>

          <div className="lg:text-right shrink-0">
            <div className="inline-flex flex-col items-start lg:items-end gap-1.5 bg-black/30 border border-white/10 rounded-2xl px-4 py-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Sending From</span>
              <span className="text-sm font-semibold text-white font-mono">
                {!waStatus || waStatus.mockMode ? 'Not connected' : waStatus.fromNumber}
              </span>
              {!isLive && waStatus && !waStatus.mockMode && (
                <span className="text-[11px] text-amber-400">Template pending review — use the test ping below</span>
              )}
            </div>
            {items.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 justify-start lg:justify-end text-[11px] font-mono text-gray-500">
                <FileText className="w-3 h-3" /> {sourceName}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick send / connectivity proof — tucked away, secondary to the real pipeline */}
      <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setPingOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="text-xs font-semibold text-gray-300 flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-gray-500" /> Quick send — prove real delivery to a verified number
          </span>
          {pingOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {pingOpen && (
          <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
            <p className="text-gray-500 text-xs">
              Sends an instant, pre-approved test message — good for a live demo before your own message template clears review. Only reaches numbers already verified in the Meta developer console.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={pingPhone}
                onChange={(e) => setPingPhone(e.target.value)}
                placeholder="+15551234567"
                className="flex-grow bg-[#1A1A1A] border border-white/10 focus:border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              />
              <button
                onClick={handleSendPing}
                disabled={pingSending || !pingPhone.trim()}
                className="text-black font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shrink-0 disabled:opacity-40"
                style={{ backgroundColor: WA_GREEN }}
              >
                {pingSending ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                Send Test
              </button>
            </div>
            {pingResult && (
              <div className={`text-xs flex items-center gap-2 ${pingResult.ok ? '' : 'text-red-400'}`} style={pingResult.ok ? { color: WA_GREEN } : undefined}>
                {pingResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {pingResult.message}
              </div>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-[#121212] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl">
          <div className="flex border-b border-white/5 pb-3 gap-6 text-sm font-semibold">
            <button
              onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
              className="pb-3 focus:outline-none transition-all relative"
              style={{ color: activeTab === 'upload' ? WA_GREEN : '#6b7280' }}
            >
              Upload Spreadsheet
              {activeTab === 'upload' && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: WA_GREEN }} />}
            </button>
            <button
              onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
              className="pb-3 focus:outline-none transition-all relative"
              style={{ color: activeTab === 'paste' ? WA_GREEN : '#6b7280' }}
            >
              Paste Raw Data
              {activeTab === 'paste' && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: WA_GREEN }} />}
            </button>
          </div>

          <div className="pt-2">
            {activeTab === 'upload' ? (
              <div className="space-y-4">
                <div className="max-w-xl">
                  <h3 className="text-white font-semibold text-lg">Load a CSV or Excel patient list</h3>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                    Export a lapsed-patient list from your practice software and drop it here. Columns are matched automatically for name, phone, last visit date, and clinic.
                  </p>
                </div>
                <PatientUploadZone onParsed={(res, file) => handleParsed(res, file)} onError={handleError} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-w-xl">
                  <h3 className="text-white font-semibold text-lg">Paste rows straight from a spreadsheet</h3>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                    Copy cells directly from Excel or Sheets and paste them in. Phone numbers should be in international format (e.g. +15551234567).
                  </p>
                </div>
                <PatientPasteInput onParsed={handleParsed} onError={handleError} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">Re-engagement queue</h3>
              <p className="text-gray-500 text-xs mt-0.5">Every patient, one row each — writing, sending, delivered.</p>
            </div>
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-white font-mono transition-colors flex items-center gap-1.5 border border-white/5 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.04] px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start Over
            </button>
          </div>
          <ReengagementDashboard
            items={items}
            errors={errors}
            onClear={handleClear}
            isRunning={isRunning}
            isPaused={isPaused}
            onStart={() => reengagementManager.start()}
            onPause={() => reengagementManager.pause()}
            onResume={() => reengagementManager.resume()}
            onRetry={(id) => reengagementManager.retry(id)}
            onCancel={(id) => reengagementManager.cancel(id)}
          />
        </div>
      )}
    </div>
  );
}
