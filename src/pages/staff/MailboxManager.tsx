import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  ShieldCheck, 
  Flame, 
  Activity, 
  AlertTriangle, 
  Plus, 
  Pause, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  Trash2, 
  Send, 
  Layers
} from 'lucide-react';
import { MailboxRecord, DeliverabilityHealthSummary } from '../../services/mailbox/MailboxTypes';
import { mailboxRepository } from '../../services/mailbox/MailboxRepository';
import { warmupEngine } from '../../services/mailbox/WarmupEngine';
import { deliverabilityService } from '../../services/mailbox/DeliverabilityService';
import { emailVerificationService } from '../../services/mailbox/EmailVerificationService';
import { multiGmailAuthManager } from '../../services/gmail/MultiGmailAuthManager';

export default function MailboxManager() {
  const [mailboxes, setMailboxes] = useState<MailboxRecord[]>([]);
  const [healthSummary, setHealthSummary] = useState<DeliverabilityHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await mailboxRepository.getAll();
      const summary = await deliverabilityService.getHealthSummary();
      setMailboxes(list);
      setHealthSummary(summary);
    } catch (err) {
      console.error('Failed to load mailbox data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paused' ? 'healthy' : 'paused';
    await mailboxRepository.updateStatus(id, nextStatus as any);
    await loadData();
  };

  const handleRemoveMailbox = async (id: string, email: string) => {
    await mailboxRepository.removeMailbox(id);
    multiGmailAuthManager.disconnectEmail(email);
    await loadData();
  };

  const handleAddMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    await mailboxRepository.addMailbox(newEmail, newName);
    setNewEmail('');
    setNewName('');
    setShowAddModal(false);
    await loadData();
  };

  const handleTestVerify = async () => {
    if (!verifyEmailInput) return;
    setVerifying(true);
    const res = await emailVerificationService.verifyEmail(verifyEmailInput);
    setVerifyResult(res);
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-syne text-white">Outbound Mailbox Manager</h1>
            <span className="px-2.5 py-1 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-semibold">
              LIVE DOMAIN POOL
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Connect and manage your official Google Workspace mailboxes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all border border-white/5"
            title="Refresh State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" />
            Connect New Mailbox
          </button>
        </div>
      </div>

      {/* Deliverability Health Overview Grid */}
      {healthSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
              <span>DOMAIN HEALTH SCORE</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-1">
              {healthSummary.overallHealthScore}<span className="text-sm text-gray-400">/100</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  healthSummary.overallHealthScore >= 90 ? 'bg-emerald-400' : healthSummary.overallHealthScore >= 70 ? 'bg-yellow-400' : 'bg-red-500'
                }`}
                style={{ width: `${healthSummary.overallHealthScore}%` }}
              />
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
              <span>ACTIVE MAILBOXES</span>
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-1">
              {mailboxes.length}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-mono">
              <span className="text-emerald-400 font-semibold">{healthSummary.healthyMailboxes} Healthy</span> • <span className="text-amber-400 font-semibold">{healthSummary.warmingMailboxes} Warming</span>
            </p>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
              <span>SENT TODAY / CAPACITY</span>
              <Send className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-white mb-1">
              {healthSummary.globalSentToday} <span className="text-sm text-gray-400">/ {healthSummary.globalSentToday + healthSummary.globalRemainingCapacity}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 font-mono">
              {healthSummary.globalRemainingCapacity} remaining sends today
            </p>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
              <span>DNS AUTH (SPF/DKIM/DMARC)</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400 mb-1">
              {healthSummary.spfPassing}/{healthSummary.totalMailboxes || 1} <span className="text-sm text-gray-400 font-normal">Verified</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 font-mono">
              Protected authentication
            </p>
          </div>
        </div>
      )}

      {/* Connected Mailboxes Table */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-lg">Connected Mailbox Pool</h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {mailboxes.length} Active Connected Accounts
          </span>
        </div>

        {mailboxes.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Mail className="w-12 h-12 text-gray-600 mx-auto" />
            <h4 className="text-white font-semibold text-base">No Mailboxes Connected</h4>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Click <strong>Connect New Mailbox</strong> above to link your Google Workspace accounts (`jason@ajandco.site`, etc.) for cold outreach.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm rounded-xl transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Connect Mailbox Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/[0.02] text-xs font-mono text-gray-400 uppercase border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Sender Mailbox</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Warmup Progress</th>
                  <th className="px-6 py-4">Daily Limit</th>
                  <th className="px-6 py-4">Sent Today</th>
                  <th className="px-6 py-4">Health Score</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {mailboxes.map((mb) => {
                  const health = warmupEngine.calculateHealthScore(mb);
                  const isConnected = multiGmailAuthManager.isEmailConnected(mb.email);

                  return (
                    <tr key={mb.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {mb.email}
                            {isConnected && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Google OAuth Active" />
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{mb.displayName}</div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-mono rounded-full font-semibold uppercase ${
                          mb.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          mb.status === 'warming' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {mb.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div className="text-xs font-semibold text-white">Day {mb.warmupDay}</div>
                            <div className="text-[10px] text-gray-400 font-mono uppercase">{mb.warmupStage.replace('_', ' ')}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono font-semibold text-white">
                        {mb.currentDailyLimit} / day
                      </td>

                      <td className="px-6 py-4 font-mono text-gray-300">
                        <span className="text-emerald-400 font-semibold">{mb.todaySentCount}</span>
                        <span className="text-gray-500"> ({mb.remainingCapacity} left)</span>
                      </td>

                      <td className="px-6 py-4 font-mono">
                        <span className={`font-semibold ${health >= 90 ? 'text-emerald-400' : health >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {health}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isConnected ? (
                            <span className="px-2.5 py-1 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              OAuth Active
                            </span>
                          ) : (
                            <a
                              href={multiGmailAuthManager.getAuthUrlForEmail(mb.email)}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Connect Google
                            </a>
                          )}

                          <button
                            onClick={() => handleToggleStatus(mb.id, mb.status)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-all border border-white/5"
                            title={mb.status === 'paused' ? 'Resume Mailbox' : 'Pause Mailbox'}
                          >
                            {mb.status === 'paused' ? (
                              <Play className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Pause className="w-4 h-4 text-amber-400" />
                            )}
                          </button>

                          <button
                            onClick={() => handleRemoveMailbox(mb.id, mb.email)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/10"
                            title="Remove Mailbox"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real-time Email Verification Tool */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white text-lg">Real-Time Lead Verification Guard</h3>
        </div>

        <p className="text-sm text-gray-400">
          Verify syntax, detect disposable temporary domains, and check MX records before sending outreach emails.
        </p>

        <div className="flex items-center gap-3 max-w-xl">
          <input
            type="email"
            placeholder="Enter lead email (e.g. prospect@targetcompany.com)"
            value={verifyEmailInput}
            onChange={(e) => setVerifyEmailInput(e.target.value)}
            className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleTestVerify}
            disabled={verifying}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-semibold text-black text-sm rounded-xl transition-all disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify Lead'}
          </button>
        </div>

        {verifyResult && (
          <div className="mt-4 p-4 rounded-xl border bg-white/[0.02] border-white/10 max-w-xl font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">STATUS:</span>
              <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                verifyResult.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                verifyResult.status === 'risky' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {verifyResult.status}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-400">REASON:</span>
              <span>{verifyResult.reason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Connect Mailbox Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white text-lg">Connect Google Workspace Mailbox</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMailbox} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">Google Workspace Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jason@ajandco.site"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jason | AJ & Co."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                Newly connected mailboxes will start automatically in <strong>Stage 1 Warmup</strong> (10 emails/day max) to protect domain reputation.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-semibold text-black text-sm rounded-xl transition-all"
                >
                  Save &amp; Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
