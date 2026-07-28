-- 016_campaign_management.sql
-- Create campaigns table and link prospects with campaign foreign keys.

-- 1. Create Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Draft' NOT NULL, -- 'Draft', 'Active', 'Paused', 'Completed', 'Archived'
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_prospects INTEGER DEFAULT 0 NOT NULL,
    completed_prospects INTEGER DEFAULT 0 NOT NULL,
    failed_prospects INTEGER DEFAULT 0 NOT NULL,
    emails_generated INTEGER DEFAULT 0 NOT NULL,
    drafts_created INTEGER DEFAULT 0 NOT NULL,
    notes TEXT
);

-- 2. Alter Prospects Table to add campaign_id link
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- 3. Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Campaigns
DROP POLICY IF EXISTS "Auth campaigns access" ON public.campaigns;
CREATE POLICY "Auth campaigns access" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_prospects_campaign_id ON public.prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
