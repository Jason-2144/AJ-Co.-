import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin';
import { BpMailbox } from './types';

function rowToMailbox(r: any): BpMailbox {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    status: r.status,
    warmupDay: r.warmup_day,
    warmupStage: r.warmup_stage,
    currentDailyLimit: r.current_daily_limit,
    todaySentCount: r.today_sent_count,
    lastSentResetDate: r.last_sent_reset_date,
    replyCount: r.reply_count,
    bounceCount: r.bounce_count,
    spamComplaints: r.spam_complaints,
    healthScore: r.health_score,
    oauthStatus: r.oauth_status,
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    tokenExpiry: r.token_expiry,
    spfStatus: r.spf_status,
    dkimStatus: r.dkim_status,
    dmarcStatus: r.dmarc_status,
    connectionStatus: r.connection_status,
    lastActivity: r.last_activity,
    lastPollAt: r.last_poll_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const bpMailboxRepository = {
  async getAll(): Promise<BpMailbox[]> {
    const { data, error } = await supabase.from('bp_mailboxes').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToMailbox);
  },

  async getById(id: string): Promise<BpMailbox | null> {
    const { data, error } = await supabase.from('bp_mailboxes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToMailbox(data) : null;
  },

  async getByEmail(email: string): Promise<BpMailbox | null> {
    const { data, error } = await supabase.from('bp_mailboxes').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (error) throw error;
    return data ? rowToMailbox(data) : null;
  },

  async addMailbox(email: string, displayName: string): Promise<BpMailbox> {
    const id = `bpmb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase
      .from('bp_mailboxes')
      .insert({ id, email: email.toLowerCase(), display_name: displayName })
      .select()
      .single();
    if (error) throw error;
    return rowToMailbox(data);
  },

  async update(id: string, updates: Record<string, any>): Promise<BpMailbox> {
    const { data, error } = await supabase
      .from('bp_mailboxes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToMailbox(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('bp_mailboxes').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Resets today_sent_count to 0 for any mailbox whose reset date has rolled over.
   * Called on every poll/send tick so daily caps actually reset day to day.
   */
  async rolloverDailyCounters(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('bp_mailboxes')
      .update({ today_sent_count: 0, last_sent_reset_date: today })
      .lt('last_sent_reset_date', today);
    if (error) throw error;
  },
};

export default bpMailboxRepository;
