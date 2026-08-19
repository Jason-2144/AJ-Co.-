-- 020_whatsapp_reengagement.sql
-- Relational schema for the WhatsApp Patient Re-Engagement module persistence.

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    last_visit_date TIMESTAMP WITH TIME ZONE,
    clinic_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Reengagement Items Table (per-patient campaign queue state)
CREATE TABLE IF NOT EXISTS public.reengagement_items (
    id UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status TEXT NOT NULL, -- 'queued', 'generating', 'sending', 'completed', 'failed'
    current_stage TEXT NOT NULL,
    progress INTEGER DEFAULT 0 NOT NULL,
    generated_message TEXT,
    message_sid TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    error TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. WhatsApp Messages Table (delivery/read status log, keyed by patient)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    patient_id UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
    message_sid TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'sent', 'delivered', 'read', 'failed', 'replied'
    mock BOOLEAN DEFAULT false NOT NULL,
    created_time BIGINT,
    last_error TEXT
);

-- Seed feature flag, mirroring the ai_outreach flag pattern
INSERT INTO feature_flags (key, name, is_enabled, description)
VALUES ('whatsapp_reengagement', 'WhatsApp Patient Re-Engagement', true, 'AI-personalized WhatsApp re-engagement campaigns for lapsed dental patients')
ON CONFLICT (key) DO UPDATE SET is_enabled = true;

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reengagement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Auth patients access" ON public.patients;
DROP POLICY IF EXISTS "Auth reengagement_items access" ON public.reengagement_items;
DROP POLICY IF EXISTS "Auth whatsapp_messages access" ON public.whatsapp_messages;

-- Create ALL policies for Authenticated users to allow teamwork collaboration
CREATE POLICY "Auth patients access" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth reengagement_items access" ON public.reengagement_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth whatsapp_messages access" ON public.whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reengagement_items_status ON public.reengagement_items(status);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_sid ON public.whatsapp_messages(message_sid);
