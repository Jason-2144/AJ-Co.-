-- 017_intelligent_research.sql
-- Relational tables to store multi-page crawls, raw contents, screenshots, and version hashes.

-- 1. Create Research Sessions Table
CREATE TABLE IF NOT EXISTS public.research_sessions (
    prospect_id UUID PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    pages_crawled INTEGER DEFAULT 0 NOT NULL,
    total_size_bytes BIGINT DEFAULT 0 NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    last_crawl_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Research Pages Cache Table
CREATE TABLE IF NOT EXISTS public.research_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    status_code INTEGER,
    load_time_ms INTEGER,
    content_length INTEGER,
    cleaned_content TEXT,
    screenshot_path TEXT,
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (prospect_id, url)
);

-- 3. Enable RLS
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_pages ENABLE ROW LEVEL SECURITY;

-- 4. Set Policies for Authenticated Team members
DROP POLICY IF EXISTS "Auth research_sessions access" ON public.research_sessions;
CREATE POLICY "Auth research_sessions access" ON public.research_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth research_pages access" ON public.research_pages;
CREATE POLICY "Auth research_pages access" ON public.research_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Indexes for quick JOINs
CREATE INDEX IF NOT EXISTS idx_research_pages_prospect ON public.research_pages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_research_pages_url ON public.research_pages(url);
