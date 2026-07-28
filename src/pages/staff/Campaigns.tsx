import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { campaignStore } from '../../services/campaign/CampaignStore';
import { campaignService } from '../../services/campaign/CampaignService';
import { Campaign, CampaignStatus, CampaignStats } from '../../services/campaign/CampaignTypes';
import { queueStore } from '../../services/queue/QueueStore';
import { queueManager } from '../../services/queue/QueueManager';
import { QueueItem } from '../../services/queue/QueueTypes';
import { ProspectStatus } from '../../types/prospect';
import { researchStore } from '../../services/research/ResearchStore';
import { analysisStore } from '../../services/analysis/AnalysisStore';
import { emailStore } from '../../services/email/EmailStore';
import { gmailStore } from '../../services/gmail/GmailStore';
import UploadZone from '../../components/staff/UploadZone';
import PasteInput from '../../components/staff/PasteInput';
import QueueDashboard from '../../components/staff/QueueDashboard';
import { 
  FolderGit2, Plus, Search, RotateCcw, AlertTriangle, AlertCircle, Trash2, XCircle, Eye, 
  ChevronLeft, ChevronRight, CheckCircle, Info, ExternalLink, X, Edit2, Copy,
  Check, FileText, RefreshCw, BarChart2, Globe, Brain, Send, Play, Pause, Loader,
  Mail, Calendar, FileSpreadsheet, Keyboard, ToggleLeft, ToggleRight, ListFilter, SlidersHorizontal
} from 'lucide-react';

export default function Campaigns() {
  const { profile } = useAuth();
  
  // Campaign Lists & Store subscriptions
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('created_at_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add / Edit Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<CampaignStatus>('Draft');
  
  // Queue dashboard states
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeImportTab, setActiveImportTab] = useState<'upload' | 'paste'>('upload');
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importSourceName, setImportSourceName] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  // Selected Prospects checkbox mapping
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<string>>(new Set());

  // Trigger store loads on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([
          campaignService.list(),
          queueStore.loadFromSupabase(),
          researchStore.loadFromSupabase(),
          analysisStore.loadFromSupabase(),
          emailStore.loadFromSupabase(),
          gmailStore.loadFromSupabase(),
        ]);
        setCampaigns(campaignStore.getAll());
        
        // Sync queue running states
        setIsRunning(queueManager.getIsRunning());
        setIsPaused(queueManager.getIsPaused());
      } catch (err) {
        console.error('Failed to initialize campaigns data:', err);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Subscriptions
    const unsubCampaigns = campaignStore.subscribe(() => {
      setCampaigns(campaignStore.getAll());
    });

    const unsubscribeQueue = queueStore.subscribe(() => {
      setQueueItems(queueStore.getItems());
    });

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
      unsubCampaigns();
      unsubscribeQueue();
      unsubStarted();
      unsubPaused();
      unsubResumed();
      unsubFinished();
    };
  }, []);

  // Update statistics and prospects list when campaign details load
  useEffect(() => {
    if (selectedCampaign) {
      const loadStats = async () => {
        try {
          const stats = await campaignService.getStats(selectedCampaign.id);
          setCampaignStats(stats);
          
          // Force queue store re-pull to match campaign
          setQueueItems(queueStore.getItems().filter(qi => qi.prospect.campaignId === selectedCampaign.id));
        } catch (err) {
          console.error('Failed to load statistics for campaign:', err);
        }
      };
      loadStats();
    } else {
      setCampaignStats(null);
      setSelectedProspectIds(new Set());
    }
  }, [selectedCampaign, queueItems.length]);

  // Handle forms save (create / edit)
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      if (editId) {
        // Edit campaign
        await campaignService.update(editId, {
          name: formName,
          description: formDescription,
          notes: formNotes,
          status: formStatus,
        });
      } else {
        // Create campaign
        await campaignService.create({
          name: formName,
          description: formDescription,
          notes: formNotes,
          status: 'Draft',
        });
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormNotes('');
    setFormStatus('Draft');
    setEditId(null);
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const handleEditClick = (c: Campaign) => {
    setEditId(c.id);
    setFormName(c.name);
    setFormDescription(c.description || '');
    setFormNotes(c.notes || '');
    setFormStatus(c.status);
    setShowEditModal(true);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This will delete all prospects and history.')) return;
    try {
      await campaignService.delete(id);
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateCampaign = async (id: string) => {
    try {
      setLoading(true);
      await campaignService.duplicate(id);
    } catch (err) {
      console.error('Duplication failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Campaign-Specific Queue Triggers
  const handleRunCampaign = () => {
    if (!selectedCampaign) return;
    queueManager.setCampaignFilter(selectedCampaign.id);
    queueManager.start();
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePauseCampaign = () => {
    queueManager.pause();
    setIsPaused(true);
  };

  const handleResumeCampaign = () => {
    queueManager.resume();
    setIsPaused(false);
  };

  const handleCancelCampaign = () => {
    if (!selectedCampaign) return;
    queueManager.cancelCampaignRemaining(selectedCampaign.id);
  };

  const handleRetryFailedCampaign = () => {
    if (!selectedCampaign) return;
    queueManager.retryCampaignFailed(selectedCampaign.id);
  };

  // Run selected prospects specifically
  const handleRunSelectedProspects = () => {
    if (selectedProspectIds.size === 0 || !selectedCampaign) return;
    
    // Reset checked items to queued status
    selectedProspectIds.forEach((id) => {
      queueManager.retry(id);
    });

    // Run active queue filtered by this campaign
    queueManager.setCampaignFilter(selectedCampaign.id);
    queueManager.start();
    
    // Clear selection
    setSelectedProspectIds(new Set());
  };

  const toggleSelectProspect = (id: string) => {
    const newSet = new Set(selectedProspectIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedProspectIds(newSet);
  };

  const toggleSelectAllProspects = (currentIds: string[]) => {
    const allSelected = currentIds.every(id => selectedProspectIds.has(id));
    const newSet = new Set(selectedProspectIds);
    if (allSelected) {
      currentIds.forEach(id => newSet.delete(id));
    } else {
      currentIds.forEach(id => newSet.add(id));
    }
    setSelectedProspectIds(newSet);
  };

  // Parse results linked to this campaign
  const handleParsed = (result: any, name?: string) => {
    if (!selectedCampaign) return;
    if (result.prospects.length === 0) {
      setImportErrorMsg('No valid prospects found in the uploaded file.');
      return;
    }

    // Auto-link campaignId to each prospect
    const linked = result.prospects.map((p: any) => ({
      ...p,
      campaignId: selectedCampaign.id,
    }));

    queueManager.enqueueMany(linked);
    setImportErrors(result.errors);
    setImportSourceName(name || 'Clipboard data stream');
    setImportErrorMsg(null);
  };

  // Filter Campaigns list
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort Campaigns
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
    if (sortBy === 'progress_desc') {
      const aProg = a.totalProspects > 0 ? (a.completedProspects / a.totalProspects) : 0;
      const bProg = b.totalProspects > 0 ? (b.completedProspects / b.totalProspects) : 0;
      return bProg - aProg;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // default created_at_desc
  });

  // Paginated Campaigns
  const totalPages = Math.ceil(sortedCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = sortedCampaigns.slice(startIndex, startIndex + itemsPerPage);

  // Active Campaign Prospects list
  const campaignProspectsList = queueItems.filter(qi => qi.prospect.campaignId === selectedCampaign?.id);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs text-gray-500 font-mono">Loading campaign workspaces database records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Dynamic View rendering: Campaign details or campaigns list */}
      {selectedCampaign ? (
        // ==========================================================
        // 1. CAMPAIGN DETAILS VIEW
        // ==========================================================
        <div className="space-y-8">
          {/* Header Panel */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Campaigns
              </button>
              <h2 className="font-syne font-bold text-3xl text-white flex items-center gap-3">
                {selectedCampaign.name}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  selectedCampaign.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : selectedCampaign.status === 'Completed'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : selectedCampaign.status === 'Paused'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-white/[0.02] text-gray-400 border-white/5'
                }`}>
                  {selectedCampaign.status}
                </span>
              </h2>
              <p className="text-gray-400 text-sm max-w-2xl">
                {selectedCampaign.description || 'No description provided.'}
              </p>
              {selectedCampaign.notes && (
                <div className="text-xs text-gray-500 font-mono italic max-w-2xl bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  <strong>Notes:</strong> {selectedCampaign.notes}
                </div>
              )}
            </div>

            {/* Campaign-Aware Queue Control Panel */}
            <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex flex-wrap gap-2 items-center self-start lg:self-auto">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block w-full mb-1">Queue Controls</span>
              
              {!isRunning ? (
                <button
                  onClick={handleRunCampaign}
                  disabled={campaignProspectsList.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Run Campaign
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={handleResumeCampaign}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseCampaign}
                      className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  <button
                    onClick={handleCancelCampaign}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel Remaining
                  </button>
                </>
              )}
              
              <button
                onClick={handleRetryFailedCampaign}
                className="border border-white/5 hover:bg-white/5 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Retry Failed
              </button>
            </div>
          </div>

          {/* Campaign Stats Overview */}
          {campaignStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
                <span className="text-[10px] font-mono text-gray-500 uppercase block">Total Prospects</span>
                <p className="text-xl font-bold text-gray-300 mt-1 font-mono">{campaignStats.totalProspects}</p>
              </div>
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
                <span className="text-[10px] font-mono text-gray-500 uppercase block">AI Succeeded</span>
                <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{campaignStats.completedProspects}</p>
              </div>
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
                <span className="text-[10px] font-mono text-gray-500 uppercase block">Scrape/AI Failures</span>
                <p className="text-xl font-bold text-red-400 mt-1 font-mono">{campaignStats.failedProspects}</p>
              </div>
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center">
                <span className="text-[10px] font-mono text-gray-500 uppercase block">Emails Generated</span>
                <p className="text-xl font-bold text-purple-400 mt-1 font-mono">{campaignStats.emailsGenerated}</p>
              </div>
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl text-center col-span-2 md:col-span-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase block">Drafts Created</span>
                <p className="text-xl font-bold text-blue-400 mt-1 font-mono">{campaignStats.draftsCreated}</p>
              </div>
            </div>
          )}

          {/* Prospects Importer if campaign has no prospects */}
          {campaignProspectsList.length === 0 ? (
            <div className="bg-[#121212] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl">
              <div className="flex border-b border-white/5 pb-3 gap-6 text-sm font-semibold">
                <button
                  onClick={() => setActiveImportTab('upload')}
                  className={`pb-3 focus:outline-none transition-all relative ${
                    activeImportTab === 'upload' ? 'text-emerald-400' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Upload Spreadsheet
                  {activeImportTab === 'upload' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveImportTab('paste')}
                  className={`pb-3 focus:outline-none transition-all relative ${
                    activeImportTab === 'paste' ? 'text-emerald-400' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Paste TSV / Raw Data
                  {activeImportTab === 'paste' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              </div>

              {importErrorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{importErrorMsg}</p>
                </div>
              )}

              <div className="pt-2">
                {activeImportTab === 'upload' ? (
                  <div className="space-y-4">
                    <div className="max-w-xl">
                      <h3 className="text-white font-semibold text-lg">Load Prospects List for this Campaign</h3>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                        Add leads directly to <strong className="text-white">{selectedCampaign.name}</strong>.
                      </p>
                    </div>
                    <UploadZone onParsed={handleParsed} onError={(err) => setImportErrorMsg(err)} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-w-xl">
                      <h3 className="text-white font-semibold text-lg">Paste TSV Cells</h3>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                        Pasted prospects will automatically connect to <strong className="text-white">{selectedCampaign.name}</strong>.
                      </p>
                    </div>
                    <PasteInput onParsed={handleParsed} onError={(err) => setImportErrorMsg(err)} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Live Queue Dashboard restricted to this campaign
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-lg">Campaign Prospects & Active Statuses</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Manage queue pipelines specifically for this batch.</p>
                </div>
                
                {/* Bulk Actions for Checked Rows */}
                {selectedProspectIds.size > 0 && (
                  <button
                    onClick={handleRunSelectedProspects}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans"
                  >
                    <Play className="w-3.5 h-3.5" /> Run Selected ({selectedProspectIds.size})
                  </button>
                )}
              </div>

              {/* Reused modular dashboard */}
              <QueueDashboard
                items={campaignProspectsList}
                errors={importErrors}
                onClear={() => {
                  queueStore.clear();
                  setImportErrors([]);
                  setImportSourceName(null);
                }}
                isRunning={isRunning}
                isPaused={isPaused}
              />
            </div>
          )}
        </div>
      ) : (
        // ==========================================================
        // 2. CAMPAIGNS LIST VIEW
        // ==========================================================
        <div className="space-y-8">
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <h2 className="font-syne font-bold text-2xl text-white flex items-center gap-2">
                <FolderGit2 className="w-6 h-6 text-emerald-400" /> Outreach Campaign Management
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Version 2.0: Group your prospects into campaigns to run, measure, and scale bulk outreach.
              </p>
            </div>
            
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Campaign
            </button>
          </div>

          {/* Search, Filter, Sort Controls */}
          <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
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
                  placeholder="Search campaigns..."
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none placeholder-gray-600"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <ListFilter className="w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#1A1A1A] border border-white/5 text-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500/30"
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Sort Selection */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#1A1A1A] border border-white/5 text-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500/30"
              >
                <option value="created_at_desc">Date Created (Newest)</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="progress_desc">Highest Progress</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedCampaigns.map((c) => {
              const progress = c.totalProspects > 0 
                ? Math.round((c.completedProspects / c.totalProspects) * 100)
                : 0;

              return (
                <div 
                  key={c.id}
                  className="bg-[#121212] border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/20 transition-all shadow-lg group relative overflow-hidden"
                >
                  {/* Subtle color highlight blob */}
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                        c.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : c.status === 'Completed'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : c.status === 'Paused'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-white/[0.02] text-gray-400 border-white/5'
                      }`}>
                        {c.status}
                      </span>
                      <div className="flex items-center gap-1 opacity-45 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(c);
                          }}
                          className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white cursor-pointer"
                          title="Edit Campaign"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateCampaign(c.id);
                          }}
                          className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white cursor-pointer"
                          title="Duplicate Campaign"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(c.id);
                          }}
                          className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-red-400 cursor-pointer"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="space-y-1">
                      <h4 className="font-syne font-bold text-white text-base group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {c.name}
                      </h4>
                      <p className="text-gray-500 text-xs line-clamp-2">
                        {c.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-[10px] font-mono text-gray-400">
                        <span>Campaign Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-1 rounded-full transition-all duration-300 ${
                            c.status === 'Completed' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setSelectedCampaign(c)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                    >
                      Open Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredCampaigns.length === 0 && (
              <div className="col-span-full bg-[#121212] border border-white/5 p-12 text-center rounded-2xl">
                <FolderGit2 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-semibold">No campaigns matching search/filters.</p>
                <p className="text-gray-600 text-xs mt-1">Create a new batch or adjust search strings.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 bg-[#121212] px-6 py-4 rounded-xl">
              <span className="text-[10px] text-gray-500 font-mono">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCampaigns.length)} of {filteredCampaigns.length} entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 bg-[#121212] border border-white/10 hover:border-emerald-500/30 text-white rounded-lg disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-white font-mono px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 bg-[#121212] border border-white/10 hover:border-emerald-500/30 text-white rounded-lg disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCampaign} className="bg-[#121212] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-5">
            <div>
              <h3 className="font-syne font-bold text-lg text-white">Create Outreach Campaign</h3>
              <p className="text-gray-500 text-xs mt-1">Initialize a new container to import client prospect lists.</p>
            </div>
            
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-gray-400 mb-2 uppercase tracking-wider text-[10px]">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="Healthcare Outreach - July Batch"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2 uppercase tracking-wider text-[10px]">Description</label>
                <textarea
                  placeholder="Targeting healthcare tech firms..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 focus:outline-none transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2 uppercase tracking-wider text-[10px]">Internal Notes</label>
                <textarea
                  placeholder="Sales executive assignments and references..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 focus:outline-none transition-colors font-sans"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="border border-white/5 hover:bg-white/5 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Create Campaign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Edit Campaign Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCampaign} className="bg-[#121212] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-5">
            <div>
              <h3 className="font-syne font-bold text-lg text-white">Edit Campaign Settings</h3>
              <p className="text-gray-500 text-xs mt-1">Modify metadata and statuses for this outreach batch.</p>
            </div>
            
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-gray-400 mb-2 uppercase tracking-wider text-[10px]">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 focus:outline-none transition-colors font-sans font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2 uppercase tracking-wider text-[10px]">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 focus:outline-none transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2 uppercase tracking-wider text-[10px]">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as CampaignStatus)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 focus:outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 uppercase tracking-wider text-[10px]">Internal Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 focus:outline-none transition-colors font-sans"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="border border-white/5 hover:bg-white/5 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
