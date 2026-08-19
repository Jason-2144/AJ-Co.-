import React, { useState } from 'react';
import { ReengagementItem, ReengagementStatus } from '../../services/patients/PatientTypes';
import { PatientParsingError } from '../../services/patients/PatientTypes';
import {
  Play, Pause, RotateCcw, XCircle, Search, Clock, Sparkles, Send, CheckCheck,
  AlertTriangle, ChevronRight
} from 'lucide-react';

interface ReengagementDashboardProps {
  items: ReengagementItem[];
  errors: PatientParsingError[];
  onClear: () => void;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

const WA_GREEN = '#25D366';
const WA_GREEN_DARK = '#1DA851';

const stageConfig: { status: ReengagementStatus; label: string; icon: React.ElementType }[] = [
  { status: ReengagementStatus.queued, label: 'Queued', icon: Clock },
  { status: ReengagementStatus.generating, label: 'Writing', icon: Sparkles },
  { status: ReengagementStatus.sending, label: 'Sending', icon: Send },
  { status: ReengagementStatus.completed, label: 'Delivered', icon: CheckCheck },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function formatTime(ts?: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** WhatsApp's own outgoing-bubble language: green, right-tailed, double-check for delivered. */
function MessageBubble({ item }: { item: ReengagementItem }) {
  if (item.status === ReengagementStatus.failed) {
    return (
      <div className="max-w-[320px] bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
        <p className="text-xs leading-snug">{item.error || 'Send failed.'}</p>
      </div>
    );
  }

  if (item.status === ReengagementStatus.queued) {
    return <span className="text-xs text-gray-600 italic">Not started</span>;
  }

  if (item.status === ReengagementStatus.generating) {
    return (
      <div className="flex items-center gap-2 text-xs text-cyan-400">
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" />
        </span>
        Writing a personal note…
      </div>
    );
  }

  if (!item.generatedMessage) return <span className="text-xs text-gray-600">—</span>;

  const isDelivered = item.status === ReengagementStatus.completed;

  return (
    <div
      className="max-w-[320px] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-lg"
      style={{ background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}
    >
      <p className="text-xs leading-snug">{item.generatedMessage}</p>
      <div className="flex items-center justify-end gap-1 mt-1.5">
        <span className="text-[10px] text-white/70">{formatTime(item.finishedAt || item.startedAt)}</span>
        {isDelivered ? (
          <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
        ) : (
          <Send className="w-3 h-3 text-white/70" />
        )}
      </div>
    </div>
  );
}

export default function ReengagementDashboard({
  items, errors, onClear, isRunning, isPaused, onStart, onPause, onResume, onRetry, onCancel,
}: ReengagementDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter((item) => {
    const p = item.patient;
    const searchString = `${p.name} ${p.phone} ${item.status}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const countFor = (status: ReengagementStatus) => items.filter((i) => i.status === status).length;
  const failedCount = countFor(ReengagementStatus.failed);
  const queuedCount = countFor(ReengagementStatus.queued);

  return (
    <div className="space-y-6">
      {/* Pipeline — a real sequence, so it's shown as one */}
      <div className="bg-[#121212] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center overflow-x-auto">
          {stageConfig.map((stage, idx) => {
            const count = countFor(stage.status);
            const isTerminal = stage.status === ReengagementStatus.completed;
            return (
              <React.Fragment key={stage.status}>
                <div className="flex flex-col items-center gap-1.5 min-w-[84px] shrink-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={
                      isTerminal
                        ? { backgroundColor: `${WA_GREEN}1A`, borderColor: `${WA_GREEN}40`, color: WA_GREEN }
                        : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }
                    }
                  >
                    <stage.icon className="w-[18px] h-[18px]" />
                  </div>
                  <span className="text-lg font-bold text-white leading-none">{count}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{stage.label}</span>
                </div>
                {idx < stageConfig.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-700 shrink-0 mx-1 sm:mx-3" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Failures — only surfaced when they exist, not sitting evenly beside success */}
      {failedCount > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {failedCount} message{failedCount > 1 ? 's' : ''} didn't go through — retry from the table below.
        </div>
      )}

      {/* Parsing errors */}
      {errors.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-300 space-y-1 max-h-32 overflow-y-auto">
          <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {errors.length} row(s) had issues:</p>
          {errors.slice(0, 5).map((e, idx) => (
            <p key={idx} className="text-amber-400/80">Row {e.row}: {e.errors.join(', ')}</p>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-grow max-w-xs">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patients..."
            className="w-full bg-[#121212] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={onStart}
              disabled={queuedCount === 0}
              className="text-black font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: WA_GREEN }}
            >
              <Play className="w-3.5 h-3.5" /> Send to Queued Patients
            </button>
          ) : isPaused ? (
            <button onClick={onResume} className="text-black font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2" style={{ backgroundColor: WA_GREEN }}>
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          ) : (
            <button onClick={onPause} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-red-400 font-mono transition-colors flex items-center gap-1.5 border border-white/5 hover:border-red-500/20 bg-white/[0.01] px-3 py-2 rounded-xl"
          >
            <XCircle className="w-3.5 h-3.5" /> Clear List
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#121212] rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-gray-500 font-mono uppercase">
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-gray-500 text-sm">No patients match your search.</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.01] align-top">
                  <td className="px-4 py-4 w-56">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: `${WA_GREEN}1A`, color: WA_GREEN }}
                      >
                        {initialsOf(item.patient.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{item.patient.name}</p>
                        <p className="text-gray-500 font-mono text-[11px] truncate">{item.patient.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <MessageBubble item={item} />
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {item.status === ReengagementStatus.failed && (
                      <button onClick={() => onRetry(item.id)} className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Retry
                      </button>
                    )}
                    {(item.status === ReengagementStatus.queued || item.status === ReengagementStatus.generating || item.status === ReengagementStatus.sending) && (
                      <button onClick={() => onCancel(item.id)} className="text-xs text-gray-500 hover:text-red-400 inline-flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
