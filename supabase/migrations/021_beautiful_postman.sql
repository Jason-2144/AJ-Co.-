-- Beautiful Postman: fully isolated outbound agent (separate from legacy outreach/mailbox tables)

CREATE TABLE IF NOT EXISTS bp_mailboxes (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'warming' CHECK (status IN ('healthy', 'warming', 'paused', 'disabled')),
  warmup_day INT DEFAULT 1,
  warmup_stage VARCHAR(50) DEFAULT 'stage_1',
  current_daily_limit INT DEFAULT 8,
  today_sent_count INT DEFAULT 0,
  last_sent_reset_date DATE DEFAULT CURRENT_DATE,
  reply_count INT DEFAULT 0,
  bounce_count INT DEFAULT 0,
  spam_complaints INT DEFAULT 0,
  health_score INT DEFAULT 90,
  oauth_status VARCHAR(50) DEFAULT 'disconnected' CHECK (oauth_status IN ('connected', 'expired', 'disconnected')),
  access_token TEXT,
  refresh_token TEXT,
  token_expiry BIGINT,
  spf_status VARCHAR(20) DEFAULT 'unknown',
  dkim_status VARCHAR(20) DEFAULT 'unknown',
  dmarc_status VARCHAR(20) DEFAULT 'unknown',
  connection_status VARCHAR(20) DEFAULT 'offline',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  last_poll_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bp_prospects (
  id VARCHAR(255) PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company VARCHAR(255),
  website VARCHAR(500),
  email VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  source VARCHAR(50) DEFAULT 'apollo_csv',
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued','researching','generating','ready','sending','sent','failed','skipped')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bp_research (
  id VARCHAR(255) PRIMARY KEY,
  prospect_id VARCHAR(255) REFERENCES bp_prospects(id) ON DELETE CASCADE,
  raw_content TEXT,
  source VARCHAR(50) DEFAULT 'website_scrape',
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bp_generated_emails (
  id VARCHAR(255) PRIMARY KEY,
  prospect_id VARCHAR(255) REFERENCES bp_prospects(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT NOT NULL,
  had_placeholders BOOLEAN DEFAULT false,
  regenerate_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','sent','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bp_sent_emails (
  id VARCHAR(255) PRIMARY KEY,
  prospect_id VARCHAR(255) REFERENCES bp_prospects(id) ON DELETE CASCADE,
  generated_email_id VARCHAR(255) REFERENCES bp_generated_emails(id) ON DELETE SET NULL,
  mailbox_id VARCHAR(255) REFERENCES bp_mailboxes(id) ON DELETE SET NULL,
  sender_email VARCHAR(255),
  recipient_email VARCHAR(255),
  subject TEXT,
  gmail_message_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced','replied')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bp_email_events (
  id VARCHAR(255) PRIMARY KEY,
  sent_email_id VARCHAR(255) REFERENCES bp_sent_emails(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent','failed','replied','bounced')),
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bp_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'main',
  example_emails JSONB DEFAULT '[]'::jsonb,
  writing_notes TEXT DEFAULT '',
  daily_send_cap_per_mailbox INT DEFAULT 25,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bp_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_bp_prospects_status ON bp_prospects(status);
CREATE INDEX IF NOT EXISTS idx_bp_sent_emails_status ON bp_sent_emails(status);
CREATE INDEX IF NOT EXISTS idx_bp_sent_emails_recipient ON bp_sent_emails(recipient_email);
