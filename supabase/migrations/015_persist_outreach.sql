-- 015_persist_outreach.sql
-- Relational schema for AI Outreach Module persistence.

-- 1. Prospects Table
CREATE TABLE IF NOT EXISTS public.prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT NOT NULL,
    website TEXT,
    city TEXT,
    state TEXT,
    contacts TEXT[] NOT NULL DEFAULT '{}',
    emails TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Queue Items Table
CREATE TABLE IF NOT EXISTS public.queue_items (
    id UUID PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status TEXT NOT NULL, -- e.g. 'queued', 'researching', 'analysing', 'generating', 'drafting', 'completed', 'failed'
    current_stage TEXT NOT NULL,
    progress INTEGER DEFAULT 0 NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    error TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Website Research Table
CREATE TABLE IF NOT EXISTS public.website_research (
    prospect_id UUID PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    final_url TEXT,
    title TEXT,
    meta_description TEXT,
    headings TEXT[] NOT NULL DEFAULT '{}',
    body_text TEXT,
    internal_links TEXT[] NOT NULL DEFAULT '{}',
    images JSONB NOT NULL DEFAULT '[]',
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration INTEGER DEFAULT 0 NOT NULL,
    http_status INTEGER DEFAULT 0 NOT NULL
);

-- 4. Company Analysis Table
CREATE TABLE IF NOT EXISTS public.company_analysis (
    prospect_id UUID PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE,
    company_summary TEXT,
    industry TEXT,
    business_model TEXT,
    target_customers TEXT,
    products TEXT[] NOT NULL DEFAULT '{}',
    services TEXT[] NOT NULL DEFAULT '{}',
    technologies TEXT[] NOT NULL DEFAULT '{}',
    pain_points TEXT[] NOT NULL DEFAULT '{}',
    ai_opportunities JSONB NOT NULL DEFAULT '[]',
    confidence INTEGER DEFAULT 0 NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration INTEGER DEFAULT 0 NOT NULL
);

-- 5. Generated Emails Table
CREATE TABLE IF NOT EXISTS public.generated_emails (
    prospect_id UUID PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    preview TEXT,
    opening TEXT,
    body TEXT,
    opportunities JSONB NOT NULL DEFAULT '[]',
    cta TEXT,
    signature TEXT,
    confidence INTEGER DEFAULT 0 NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration INTEGER DEFAULT 0 NOT NULL
);

-- 6. Gmail Draft Records Table
CREATE TABLE IF NOT EXISTS public.gmail_draft_records (
    prospect_id UUID PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE,
    draft_id TEXT,
    thread_id TEXT,
    created_time BIGINT,
    status TEXT NOT NULL, -- 'pending', 'created', 'failed'
    last_error TEXT
);

-- 7. Processing History Table
CREATE TABLE IF NOT EXISTS public.processing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    duration INTEGER DEFAULT 0 NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_draft_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Auth prospects access" ON public.prospects;
DROP POLICY IF EXISTS "Auth queue_items access" ON public.queue_items;
DROP POLICY IF EXISTS "Auth website_research access" ON public.website_research;
DROP POLICY IF EXISTS "Auth company_analysis access" ON public.company_analysis;
DROP POLICY IF EXISTS "Auth generated_emails access" ON public.generated_emails;
DROP POLICY IF EXISTS "Auth gmail_draft_records access" ON public.gmail_draft_records;
DROP POLICY IF EXISTS "Auth processing_history access" ON public.processing_history;

-- Create ALL policies for Authenticated users to allow teamwork collaboration
CREATE POLICY "Auth prospects access" ON public.prospects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth queue_items access" ON public.queue_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth website_research access" ON public.website_research FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth company_analysis access" ON public.company_analysis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth generated_emails access" ON public.generated_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth gmail_draft_records access" ON public.gmail_draft_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth processing_history access" ON public.processing_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_items_status ON public.queue_items(status);
CREATE INDEX IF NOT EXISTS idx_processing_history_prospect ON public.processing_history(prospect_id);
