import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  FileText, 
  Phone, 
  Mail, 
  Globe, 
  TrendingUp,
  X,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { clientsService, Client, Lead, MeetingNote } from '../../services/clients';
import { usersService } from '../../services/users';
import { supabase } from '../../lib/supabase';

export default function CRM() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Selected client state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [clientOutreach, setClientOutreach] = useState<any | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  // Meeting Form
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingText, setMeetingText] = useState('');
  const [meetingSummary, setMeetingSummary] = useState('');

  // Lead Form
  const [leadTitle, setLeadTitle] = useState('');
  const [leadValue, setLeadValue] = useState(0);
  const [leadStage, setLeadStage] = useState<'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'>('new');
  const [leadNotes, setLeadNotes] = useState('');

  useEffect(() => {
    loadCRMData();
  }, []);

  async function loadCRMData() {
    try {
      setLoading(true);
      const [cList, lList] = await Promise.all([
        clientsService.getClients(),
        clientsService.getLeads()
      ]);
      setClients(cList);
      setLeads(lList);
    } catch (err) {
      console.error('Error loading CRM details:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClient = await clientsService.createClient({
        company_name: companyName,
        contact_name: contactName,
        email,
        phone,
        website,
        notes
      });
      
      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `added corporate client "${companyName}"`,
        module: 'CRM',
        new_value: newClient
      });

      setClients([...clients, newClient]);
      setShowAddClient(false);
      resetClientForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMeetingNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id) return;
    try {
      const newNote = await clientsService.createMeetingNote({
        client_id: selectedClient.id,
        title: meetingTitle,
        notes: meetingText,
        summary: meetingSummary
      });

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `created meeting log "${meetingTitle}" for client "${selectedClient.company_name}"`,
        module: 'CRM',
        new_value: newNote
      });

      setMeetingNotes([newNote, ...meetingNotes]);
      setShowAddMeeting(false);
      setMeetingTitle('');
      setMeetingText('');
      setMeetingSummary('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id) return;
    try {
      const newLead = await clientsService.createLead({
        client_id: selectedClient.id,
        title: leadTitle,
        value: leadValue,
        stage: leadStage,
        notes: leadNotes
      });

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `added sales lead pipeline "${leadTitle}"`,
        module: 'CRM',
        new_value: newLead
      });

      setLeads([newLead, ...leads]);
      setShowAddLead(false);
      setLeadTitle('');
      setLeadValue(0);
      setLeadStage('new');
      setLeadNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client "${name}"?`)) return;
    try {
      await clientsService.softDeleteClient(id, profile?.id || 'owner');
      
      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `archived client profile "${name}"`,
        module: 'CRM'
      });

      setClients(clients.filter(c => c.id !== id));
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectClient = async (client: Client) => {
    setSelectedClient(client);
    setClientOutreach(null);
    if (client.id) {
      try {
        const notes = await clientsService.getMeetingNotes(client.id);
        setMeetingNotes(notes);

        const { data: outRecords } = await supabase
          .from('outreach_companies')
          .select('*, company_research(*), ai_reports(*), generated_emails(*), sent_emails(*)')
          .eq('contact_email', client.email)
          .is('deleted_at', null)
          .maybeSingle();

        if (outRecords) {
          setClientOutreach(outRecords);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetClientForm = () => {
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setWebsite('');
    setNotes('');
  };

  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne font-bold text-2xl text-white">CRM & Client Database</h2>
          <p className="text-gray-500 text-sm mt-1">Manage client records, pipelines, and meeting archives.</p>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Client Lists Panel */}
        <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl lg:col-span-2 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-colors"
              placeholder="Search clients by name, contact, email..."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 font-mono uppercase text-xs">
                  <th className="pb-3">Company</th>
                  <th className="pb-3">Contact Person</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.map((client) => (
                  <tr 
                    key={client.id}
                    onClick={() => selectClient(client)}
                    className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${selectedClient?.id === client.id ? 'bg-emerald-500/[0.03]' : ''}`}
                  >
                    <td className="py-4 font-semibold text-white">{client.company_name}</td>
                    <td className="py-4 text-gray-300">{client.contact_name}</td>
                    <td className="py-4 text-gray-400">{client.email}</td>
                    <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleDeleteClient(client.id!, client.company_name)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Client Side-Drawer Detail */}
        <div className="space-y-6">
          {selectedClient ? (
            <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-6">
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-syne font-bold text-xl text-white">{selectedClient.company_name}</h3>
                  <p className="text-gray-500 text-xs mt-1">Client Profile</p>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Columns */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-400">
                  <Plus className="w-4 h-4 text-gray-500" />
                  <span>Contact: {selectedClient.contact_name}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <a href={`mailto:${selectedClient.email}`} className="hover:text-emerald-400 transition-colors truncate">{selectedClient.email}</a>
                </div>
                {selectedClient.phone && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
                {selectedClient.website && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <a href={selectedClient.website} target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors truncate">{selectedClient.website}</a>
                  </div>
                )}
              </div>

              {/* Lead Pipelines */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-syne font-semibold text-white text-sm">Pipeline Leads</h4>
                  <button
                    onClick={() => setShowAddLead(true)}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Lead
                  </button>
                </div>
                <div className="space-y-2">
                  {leads.filter(l => l.client_id === selectedClient.id).map(lead => (
                    <div key={lead.id} className="bg-[#1A1A1A] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{lead.title}</p>
                        <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {lead.stage}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        ${Number(lead.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meeting Notes */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-syne font-semibold text-white text-sm">Meeting Log</h4>
                  <button
                    onClick={() => setShowAddMeeting(true)}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Call
                  </button>
                </div>
                <div className="space-y-3">
                  {meetingNotes.map(note => (
                    <div key={note.id} className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-white text-sm font-semibold">{note.title}</p>
                        <span className="text-[10px] text-gray-500 font-mono">{new Date(note.created_at || '').toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{note.notes}</p>
                      {note.summary && (
                        <div className="bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 text-[10px] text-emerald-400">
                          <span className="font-bold block uppercase tracking-wider mb-1">AI Brief</span>
                          {note.summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Outreach Integration Details */}
              <div className="border-t border-white/5 pt-6 space-y-4">
                <h4 className="font-syne font-semibold text-white text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> AI Outreach Hub
                </h4>

                {clientOutreach ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-[#1A1A1A] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <span className="text-gray-400">Outreach Status:</span>
                      <span className="font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                        {clientOutreach.status}
                      </span>
                    </div>

                    {clientOutreach.ai_reports?.[0] && (
                      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="block font-mono text-[10px] text-gray-500 uppercase">AI Automation Opportunities</span>
                        <ul className="list-disc pl-4 space-y-1 text-gray-400">
                          {clientOutreach.ai_reports[0].report_data?.opportunities?.slice(0, 3).map((o: string, idx: number) => (
                            <li key={idx}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {clientOutreach.generated_emails?.[0] && (
                      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="block font-mono text-[10px] text-gray-500 uppercase">Generated Email Draft</span>
                        <p className="text-white font-semibold truncate">{clientOutreach.generated_emails[0].subject}</p>
                        <p className="text-gray-400 leading-relaxed truncate">{clientOutreach.generated_emails[0].body_text}</p>
                      </div>
                    )}

                    {clientOutreach.sent_emails?.length > 0 && (
                      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-2">
                        <span className="block font-mono text-[10px] text-gray-500 uppercase">Outreach Broadcast History</span>
                        <div className="space-y-1.5">
                          {clientOutreach.sent_emails.map((s: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] text-gray-500">
                              <span>SMTP Relay</span>
                              <span className="font-bold text-emerald-400 uppercase">{s.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 text-xs text-gray-400 space-y-3">
                    <p className="leading-relaxed">
                      No outreach campaign tracks found for this client. Open the campaign manager in the sidebar to register them.
                    </p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl text-center text-gray-500 text-sm">
              <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <span>Select a client from the database to view log files, meeting history, and proposals.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
            <h3 className="font-syne font-bold text-xl text-white mb-6">Register Corporate Client</h3>
            
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  placeholder="contact@acme.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                    placeholder="+1 555-0199"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                    placeholder="https://acme.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors h-24"
                  placeholder="Client project preferences..."
                />
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h3 className="font-syne font-bold text-xl text-white mb-6">Add Pipeline Lead</h3>
            
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Lead Name / Title</label>
                <input
                  type="text"
                  required
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  placeholder="E-commerce support build"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Value ($)</label>
                  <input
                    type="number"
                    required
                    value={leadValue}
                    onChange={(e) => setLeadValue(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Pipeline Stage</label>
                  <select
                    value={leadStage}
                    onChange={(e: any) => setLeadStage(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddLead(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Call Log / Meeting Notes Modal */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
            <h3 className="font-syne font-bold text-xl text-white mb-6">Log Meeting Notes</h3>
            
            <form onSubmit={handleAddMeetingNote} className="space-y-4">
              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Subject / Title</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                  placeholder="Q3 Planning Sync"
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Meeting Details</label>
                <textarea
                  required
                  value={meetingText}
                  onChange={(e) => setMeetingText(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors h-28"
                  placeholder="Details of call discussion..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">AI Summary / Key Action Briefs (Optional)</label>
                <textarea
                  value={meetingSummary}
                  onChange={(e) => setMeetingSummary(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors h-20"
                  placeholder="Bullet items of actions to sync..."
                />
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddMeeting(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
