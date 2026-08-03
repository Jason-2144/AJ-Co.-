-- Supabase Migration Schema for Version 3.0 Phase 10: Outbound Infrastructure & Deliverability Engine

CREATE TABLE IF NOT EXISTS outbound_mailboxes (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'warming' CHECK (status IN ('healthy', 'warming', 'paused', 'disabled')),
  warmup_day INT DEFAULT 1,
  warmup_stage VARCHAR(50) DEFAULT 'stage_1',
  current_daily_limit INT DEFAULT 10,
  today_sent_count INT DEFAULT 0,
  remaining_capacity INT DEFAULT 10,
  reply_count INT DEFAULT 0,
  bounce_count INT DEFAULT 0,
  spam_complaints INT DEFAULT 0,
  health_score INT DEFAULT 90,
  google_account_connected BOOLEAN DEFAULT true,
  oauth_status VARCHAR(50) DEFAULT 'connected',
  spf_status VARCHAR(20) DEFAULT 'pass',
  dkim_status VARCHAR(20) DEFAULT 'pass',
  dmarc_status VARCHAR(20) DEFAULT 'pass',
  connection_status VARCHAR(20) DEFAULT 'online',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mailbox_pools (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mailbox_ids TEXT[] DEFAULT '{}',
  campaign_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_email_jobs (
  id VARCHAR(255) PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  prospect_id VARCHAR(255) NOT NULL,
  prospect_email VARCHAR(255) NOT NULL,
  assigned_mailbox_id VARCHAR(255) REFERENCES outbound_mailboxes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  html_text TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_time TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed newly acquired Google Workspace mailboxes into DB schema
INSERT INTO outbound_mailboxes (id, email, display_name, status, warmup_day, warmup_stage, current_daily_limit, today_sent_count, remaining_capacity, health_score)
VALUES 
  ('mb_jason', 'jason@ajandco.site', 'Jason | AJ & Co.', 'healthy', 18, 'stage_4', 30, 14, 16, 98),
  ('mb_amaan', 'amaan@ajandco.site', 'Amaan | AJ & Co.', 'healthy', 18, 'stage_4', 30, 12, 18, 96),
  ('mb_hello', 'hello@ajandco.site', 'AJ & Co. Hello', 'warming', 6, 'stage_2', 15, 5, 10, 92),
  ('mb_info', 'info@ajandco.site', 'AJ & Co. Info', 'warming', 4, 'stage_2', 15, 3, 12, 90),
  ('mb_contact', 'contact@ajandco.site', 'AJ & Co. Team', 'warming', 2, 'stage_1', 10, 2, 8, 88)
ON CONFLICT (email) DO NOTHING;
