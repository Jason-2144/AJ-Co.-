import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, Plus, RefreshCw, Play, Trash2, Pause, PlayCircle, Mail, ShieldCheck,
  Upload, MessageSquare, Settings2, AlertCircle, CheckCircle2, XCircle, Loader
} from 'lucide-react';

type SubTab = 'queue' | 'mailboxes' | 'replies' | 'style';

interface BpProspect {
  id: string; firstName?: string; lastName?: string; company?: string; email: string;
  title?: string; status: string; error?: string;
}
interface BpMailbox {
  id: string; email: string; displayName: string; status: string; warmupDay: number;
  warmupStage: string; currentDailyLimit: number; todaySentCount: number; healthScore: number;
  oauthStatus: string; replyCount: number; bounceCount: number;
}
interface BpSentEmail {
  id: string; senderEmail: string; recipientEmail: string; subject: string; status: string; sentAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'text-gray-400 bg-white/5',
  researching: 'text-blue-400 bg-blue-500/10',
  generating: 'text-purple-400 bg-purple-500/10',
  sending: 'text-amber-400 bg-amber-500/10',
  sent: 'text-emerald-400 bg-emerald-500/10',
  replied: 'text-emerald-400 bg-emerald-500/10',
  failed: 'text-red-400 bg-red-500/10',
  bounced: 'text-red-400 bg-red-500/10',
};

export default function BeautifulPostman() {
  const [tab, setTab] = useState<SubTab>('queue');
  const [prospects, setProspects] = useState<BpProspect[]>([]);
  const [mailboxes, setMailboxes] = useState<BpMailbox[]>([]);
  const [sent, setSent] = useState<BpSentEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newMailboxEmail, setNewMailboxEmail] = useState('');
  const [newMailboxName, setNewMailboxName] = useState('');

  const [exampleEmails, setExampleEmails] = useState<{ subject: string; body: string }[]>([]);
  const [writingNotes, setWritingNotes] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [pRes, mRes, sRes, setRes] = await Promise.all([
        fetch('/api/bp/prospects'),
        fetch('/api/bp/mailboxes'),
        fetch('/api/bp/sent'),
        fetch('/api/bp/settings'),
      ]);
      setProspects(await pRes.json());
      setMailboxes(await mRes.json());
      setSent(await sRes.json());
      const settings = await setRes.json();
      setExampleEmails(settings.exampleEmails || []);
      setWritingNotes(settings.writingNotes || '');
    } catch (err) {
      console.error('Failed to load Beautiful Postman data:', err);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_success') === 'true') {
      setMessage({ type: 'ok', text: `Connected ${params.get('email')} successfully.` });
    }
    const interval = setInterval(loadAll, 8000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bp/import-csv', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessage({ type: 'ok', text: `Imported ${data.inserted} prospects (${data.skipped} skipped — missing/invalid email).` });
      setCsvText('');
      await loadAll();
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Import failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRunAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bp/run-all', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessage({ type: 'ok', text: `Started pipeline for ${data.started} queued prospects. Watch the table below as they move through research → generate → send.` });
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Failed to start.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMailbox = async () => {
    if (!newMailboxEmail || !newMailboxName) return;
    try {
      const res = await fetch('/api/bp/mailboxes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMailboxEmail, displayName: newMailboxName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const mailbox = await res.json();
      setNewMailboxEmail(''); setNewMailboxName('');
      await loadAll();

      const authRes = await fetch(`/api/bp/gmail/auth-url/${mailbox.id}`);
      if (!authRes.ok) {
        setMessage({ type: 'err', text: await authRes.text() });
        return;
      }
      const { url } = await authRes.json();
      window.location.href = url;
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Failed to add mailbox.' });
    }
  };

  const handleConnect = async (mailboxId: string) => {
    const authRes = await fetch(`/api/bp/gmail/auth-url/${mailboxId}`);
    if (!authRes.ok) { setMessage({ type: 'err', text: await authRes.text() }); return; }
    const { url } = await authRes.json();
    window.location.href = url;
  };

  const handleRemoveMailbox = async (id: string) => {
    await fetch(`/api/bp/mailboxes/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  const handleTogglePause = async (id: string) => {
    await fetch(`/api/bp/mailboxes/${id}/toggle-pause`, { method: 'POST' });
    await loadAll();
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/bp/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exampleEmails, writingNotes }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage({ type: 'ok', text: 'Email style saved.' });
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Failed to save.' });
    }
  };

  const handleAddExample = () => {
    if (!draftSubject.trim() || !draftBody.trim()) return;
    setExampleEmails([...exampleEmails, { subject: draftSubject, body: draftBody }]);
    setDraftSubject(''); setDraftBody('');
  };

  const handlePollReplies = async () => {
    setLoading(true);
    try {
      await fetch('/api/bp/poll-replies', { method: 'POST' });
      setMessage({ type: 'ok', text: 'Checked all connected inboxes for new replies/bounces.' });
      await loadAll();
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Poll failed.' });
    } finally {
      setLoading(false);
    }
  };

  const googleNotConfigured = mailboxes.length === 0 ? null : mailboxes.every((m) => m.oauthStatus !== 'connected');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="font-syne font-bold text-2xl text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-emerald-400" /> Beautiful Postman
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Standalone outbound agent — separate mailboxes, separate data, separate warmup from the legacy AI Outreach module.
          </p>
        </div>
        <button
          onClick={loadAll}
          className="bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-gray-300 text-xs font-mono px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 ${message.type === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {message.type === 'ok' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p>{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">dismiss</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b border-white/5 gap-6 text-sm font-semibold">
        {[
          { id: 'queue', label: 'Import & Queue', icon: Upload },
          { id: 'mailboxes', label: 'Mailboxes', icon: Mail },
          { id: 'replies', label: 'Sent & Replies', icon: MessageSquare },
          { id: 'style', label: 'Email Style', icon: Settings2 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as SubTab)}
            className={`pb-3 flex items-center gap-2 relative transition-all ${tab === t.id ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <div className="space-y-6">
          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-white font-semibold">Import Apollo CSV</h3>
            <p className="text-gray-500 text-xs">Paste the full contents of your Apollo export CSV (including the header row).</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="First Name,Last Name,Company,Email,Title,Website..."
              className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-500/40"
            />
            <div className="flex gap-3">
              <button onClick={handleImportCsv} disabled={loading || !csvText.trim()} className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                <Upload className="w-4 h-4" /> Import
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Queue ({prospects.length})</h3>
            <button onClick={handleRunAll} disabled={loading || prospects.every((p) => p.status !== 'queued')} className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
              <Play className="w-4 h-4" /> Run All Queued
            </button>
          </div>

          <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-gray-500 text-xs uppercase font-mono">
                <tr>
                  <th className="text-left p-3">Prospect</th>
                  <th className="text-left p-3">Company</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {prospects.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-600 text-xs">No prospects yet — import a CSV above.</td></tr>
                )}
                {prospects.map((p) => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="p-3 text-white">{[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}</td>
                    <td className="p-3 text-gray-400">{p.company || '—'}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{p.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-mono ${STATUS_COLORS[p.status] || 'text-gray-400 bg-white/5'}`}>{p.status}</span>
                      {p.error && <div className="text-red-400/70 text-[10px] mt-1 max-w-xs truncate" title={p.error}>{p.error}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'mailboxes' && (
        <div className="space-y-6">
          {googleNotConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>No mailbox is connected yet. Click "Connect" on a mailbox below — if the server hasn't been given GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET yet, that'll fail until those are set in the environment.</p>
            </div>
          )}

          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-white font-semibold">Add a mailbox</h3>
            <div className="flex gap-3 flex-wrap">
              <input value={newMailboxName} onChange={(e) => setNewMailboxName(e.target.value)} placeholder="Display name" className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white flex-1 min-w-[160px]" />
              <input value={newMailboxEmail} onChange={(e) => setNewMailboxEmail(e.target.value)} placeholder="mailbox@yourdomain.com" className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white flex-1 min-w-[220px]" />
              <button onClick={handleAddMailbox} className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add & Connect
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mailboxes.map((m) => (
              <div key={m.id} className="bg-[#121212] border border-white/5 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{m.displayName}</p>
                    <p className="text-gray-500 text-xs font-mono">{m.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-mono ${m.status === 'healthy' ? 'text-emerald-400 bg-emerald-500/10' : m.status === 'paused' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'}`}>{m.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-gray-500 block">Health</span><span className="text-white font-mono">{m.healthScore}</span></div>
                  <div><span className="text-gray-500 block">Warmup day</span><span className="text-white font-mono">{m.warmupDay}</span></div>
                  <div><span className="text-gray-500 block">Sent today</span><span className="text-white font-mono">{m.todaySentCount}/{m.currentDailyLimit}</span></div>
                  <div><span className="text-gray-500 block">Replies</span><span className="text-white font-mono">{m.replyCount}</span></div>
                  <div><span className="text-gray-500 block">Bounces</span><span className="text-white font-mono">{m.bounceCount}</span></div>
                  <div><span className="text-gray-500 block">Google</span><span className={m.oauthStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>{m.oauthStatus}</span></div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  {m.oauthStatus !== 'connected' && (
                    <button onClick={() => handleConnect(m.id)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Connect</button>
                  )}
                  <button onClick={() => handleTogglePause(m.id)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 ml-auto">
                    {m.status === 'paused' ? <PlayCircle className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />} {m.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  <button onClick={() => handleRemoveMailbox(m.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                </div>
              </div>
            ))}
            {mailboxes.length === 0 && <p className="text-gray-600 text-sm">No mailboxes added yet.</p>}
          </div>
        </div>
      )}

      {tab === 'replies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handlePollReplies} disabled={loading} className="bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-gray-300 text-xs font-mono px-4 py-2 rounded-xl transition-all flex items-center gap-2">
              {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check for replies now
            </button>
          </div>
          <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-gray-500 text-xs uppercase font-mono">
                <tr>
                  <th className="text-left p-3">Sent</th>
                  <th className="text-left p-3">From</th>
                  <th className="text-left p-3">To</th>
                  <th className="text-left p-3">Subject</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {sent.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-600 text-xs">Nothing sent yet.</td></tr>
                )}
                {sent.map((s) => (
                  <tr key={s.id} className="border-t border-white/5">
                    <td className="p-3 text-gray-500 text-xs font-mono">{new Date(s.sentAt).toLocaleString()}</td>
                    <td className="p-3 text-gray-400 text-xs font-mono">{s.senderEmail}</td>
                    <td className="p-3 text-gray-400 text-xs font-mono">{s.recipientEmail}</td>
                    <td className="p-3 text-white text-xs max-w-xs truncate">{s.subject}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-lg text-xs font-mono ${STATUS_COLORS[s.status] || 'text-gray-400 bg-white/5'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'style' && (
        <div className="space-y-6">
          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-white font-semibold">Writing notes (optional)</h3>
            <textarea
              value={writingNotes}
              onChange={(e) => setWritingNotes(e.target.value)}
              placeholder="Any extra guidance for the AI — tone details, things to avoid, etc."
              className="w-full h-20 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/40"
            />
          </div>

          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-white font-semibold">Example emails (style reference)</h3>
            <p className="text-gray-500 text-xs">Paste real emails you've written. The AI matches this tone and structure when writing new ones — it never reuses these verbatim for a different prospect.</p>
            <input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} placeholder="Subject line" className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <textarea value={draftBody} onChange={(e) => setDraftBody(e.target.value)} placeholder="Email body" className="w-full h-28 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-gray-300" />
            <button onClick={handleAddExample} className="bg-white/[0.05] hover:bg-white/[0.1] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add example</button>

            <div className="space-y-2 pt-2">
              {exampleEmails.map((e, i) => (
                <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{e.subject}</p>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{e.body}</p>
                  </div>
                  <button onClick={() => setExampleEmails(exampleEmails.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 shrink-0"><XCircle className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            <button onClick={handleSaveSettings} className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold">Save style settings</button>
          </div>
        </div>
      )}
    </div>
  );
}
