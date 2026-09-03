import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin.js';
import { BpProspect, BpGeneratedEmail, BpSentEmail, BpSettings } from './types.js';

function rowToProspect(r: any): BpProspect {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    company: r.company,
    website: r.website,
    email: r.email,
    title: r.title,
    city: r.city,
    state: r.state,
    source: r.source,
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToGeneratedEmail(r: any): BpGeneratedEmail {
  return {
    id: r.id,
    prospectId: r.prospect_id,
    subject: r.subject,
    bodyText: r.body_text,
    bodyHtml: r.body_html,
    hadPlaceholders: r.had_placeholders,
    regenerateCount: r.regenerate_count,
    status: r.status,
    createdAt: r.created_at,
  };
}

function rowToSentEmail(r: any): BpSentEmail {
  return {
    id: r.id,
    prospectId: r.prospect_id,
    generatedEmailId: r.generated_email_id,
    mailboxId: r.mailbox_id,
    senderEmail: r.sender_email,
    recipientEmail: r.recipient_email,
    subject: r.subject,
    gmailMessageId: r.gmail_message_id,
    status: r.status,
    errorMessage: r.error_message,
    sentAt: r.sent_at,
    repliedAt: r.replied_at,
    bouncedAt: r.bounced_at,
  };
}

export const bpRepository = {
  // --- PROSPECTS ---
  async insertProspects(prospects: Omit<BpProspect, 'id' | 'status' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
    if (prospects.length === 0) return 0;
    const rows = prospects.map((p) => ({
      id: `bpp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      first_name: p.firstName || null,
      last_name: p.lastName || null,
      company: p.company || null,
      website: p.website || null,
      email: p.email.toLowerCase(),
      title: p.title || null,
      city: p.city || null,
      state: p.state || null,
      source: p.source || 'apollo_csv',
    }));
    const { error, count } = await supabase.from('bp_prospects').insert(rows, { count: 'exact' });
    if (error) throw error;
    return count || rows.length;
  },

  async getProspects(status?: string): Promise<BpProspect[]> {
    let q = supabase.from('bp_prospects').select('*').order('created_at', { ascending: true });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(rowToProspect);
  },

  async getProspect(id: string): Promise<BpProspect | null> {
    const { data, error } = await supabase.from('bp_prospects').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToProspect(data) : null;
  },

  async updateProspectStatus(id: string, status: string, error?: string): Promise<void> {
    const { error: err } = await supabase
      .from('bp_prospects')
      .update({ status, error: error || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw err;
  },

  async clearAllProspects(): Promise<void> {
    const { error } = await supabase.from('bp_prospects').delete().neq('id', '__none__');
    if (error) throw error;
  },

  // --- RESEARCH ---
  async saveResearch(prospectId: string, rawContent: string, source: string): Promise<void> {
    const { error } = await supabase.from('bp_research').insert({
      id: `bpr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      prospect_id: prospectId,
      raw_content: rawContent,
      source,
    });
    if (error) throw error;
  },

  async getLatestResearch(prospectId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('bp_research')
      .select('raw_content')
      .eq('prospect_id', prospectId)
      .order('scraped_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.raw_content || null;
  },

  // --- GENERATED EMAILS ---
  async saveGeneratedEmail(prospectId: string, subject: string, bodyText: string, bodyHtml: string, hadPlaceholders: boolean, regenerateCount: number): Promise<BpGeneratedEmail> {
    const id = `bpge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const { data, error } = await supabase
      .from('bp_generated_emails')
      .insert({
        id,
        prospect_id: prospectId,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        had_placeholders: hadPlaceholders,
        regenerate_count: regenerateCount,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToGeneratedEmail(data);
  },

  // --- SENT EMAILS ---
  async logSentEmail(input: {
    prospectId: string; generatedEmailId?: string; mailboxId?: string; senderEmail: string;
    recipientEmail: string; subject: string; gmailMessageId?: string; status: string; errorMessage?: string;
  }): Promise<BpSentEmail> {
    const id = `bpse_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const { data, error } = await supabase
      .from('bp_sent_emails')
      .insert({
        id,
        prospect_id: input.prospectId,
        generated_email_id: input.generatedEmailId || null,
        mailbox_id: input.mailboxId || null,
        sender_email: input.senderEmail,
        recipient_email: input.recipientEmail.toLowerCase(),
        subject: input.subject,
        gmail_message_id: input.gmailMessageId || null,
        status: input.status,
        error_message: input.errorMessage || null,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('bp_email_events').insert({
      id: `bpev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sent_email_id: data.id,
      event_type: input.status === 'sent' ? 'sent' : 'failed',
      detail: input.errorMessage || null,
    });

    return rowToSentEmail(data);
  },

  async getSentEmails(limit = 200): Promise<BpSentEmail[]> {
    const { data, error } = await supabase
      .from('bp_sent_emails')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(rowToSentEmail);
  },

  async getUnrepliedSentByMailbox(mailboxEmail: string): Promise<BpSentEmail[]> {
    const { data, error } = await supabase
      .from('bp_sent_emails')
      .select('*')
      .eq('sender_email', mailboxEmail.toLowerCase())
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToSentEmail);
  },

  async markSentEmailEvent(id: string, status: 'replied' | 'bounced', detail?: string): Promise<void> {
    const patch: any = { status };
    if (status === 'replied') patch.replied_at = new Date().toISOString();
    if (status === 'bounced') patch.bounced_at = new Date().toISOString();
    const { error } = await supabase.from('bp_sent_emails').update(patch).eq('id', id);
    if (error) throw error;

    await supabase.from('bp_email_events').insert({
      id: `bpev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sent_email_id: id,
      event_type: status,
      detail: detail || null,
    });
  },

  // --- SETTINGS ---
  async getSettings(): Promise<BpSettings> {
    const { data, error } = await supabase.from('bp_settings').select('*').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (!data) {
      return { id: 'main', exampleEmails: [], writingNotes: '', dailySendCapPerMailbox: 25, updatedAt: new Date().toISOString() };
    }
    return {
      id: data.id,
      exampleEmails: data.example_emails || [],
      writingNotes: data.writing_notes || '',
      dailySendCapPerMailbox: data.daily_send_cap_per_mailbox,
      updatedAt: data.updated_at,
    };
  },

  async updateSettings(exampleEmails: { subject: string; body: string }[], writingNotes: string): Promise<BpSettings> {
    const { data, error } = await supabase
      .from('bp_settings')
      .update({ example_emails: exampleEmails, writing_notes: writingNotes, updated_at: new Date().toISOString() })
      .eq('id', 'main')
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      exampleEmails: data.example_emails || [],
      writingNotes: data.writing_notes || '',
      dailySendCapPerMailbox: data.daily_send_cap_per_mailbox,
      updatedAt: data.updated_at,
    };
  },
};

export default bpRepository;
