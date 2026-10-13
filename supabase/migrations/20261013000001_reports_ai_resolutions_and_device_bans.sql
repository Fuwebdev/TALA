-- Migration: Reports AI Resolutions, Anonymous Reporter Aliases & Device Ban Tables
-- Tala Platform

-- 1. Ensure reports table supports anonymous alias reporting
ALTER TABLE public.reports ALTER COLUMN reporter_profile_id DROP NOT NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_alias_id VARCHAR(128);

-- 2. AI Automated Report Resolutions Log
CREATE TABLE IF NOT EXISTS public.ai_report_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('thought', 'comment')),
    target_id UUID NOT NULL,
    reporter_alias_id VARCHAR(128),
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('VIOLATION_CONFIRMED', 'ESCALATED', 'NO_VIOLATION')),
    ai_response_message TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    confidence_score NUMERIC(5, 4) DEFAULT 0.95 NOT NULL,
    policy_category VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_resolutions_target ON public.ai_report_resolutions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ai_resolutions_reporter ON public.ai_report_resolutions(reporter_alias_id);

-- 3. Device Bans Table (Hardware Canvas/WebGL fingerprints)
CREATE TABLE IF NOT EXISTS public.device_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint VARCHAR(128) NOT NULL UNIQUE,
    strike_count INT DEFAULT 1 NOT NULL,
    ban_level INT DEFAULT 0 NOT NULL,
    locked_until TIMESTAMPTZ,
    is_permanent BOOLEAN DEFAULT FALSE NOT NULL,
    reason TEXT DEFAULT 'Repeated community policy violations',
    alias_id VARCHAR(128),
    alias_name VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_bans_fp ON public.device_bans(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_bans_locked ON public.device_bans(locked_until);

-- 4. User Violations History
CREATE TABLE IF NOT EXISTS public.user_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint VARCHAR(128) NOT NULL,
    alias_id VARCHAR(128),
    alias_name VARCHAR(128),
    violation_reason TEXT NOT NULL,
    content_snippet TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Ban Appeals Table
CREATE TABLE IF NOT EXISTS public.ban_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint VARCHAR(128) NOT NULL,
    alias_id VARCHAR(128),
    alias_name VARCHAR(128),
    appeal_text TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'under_review' NOT NULL CHECK (status IN ('under_review', 'approved', 'rejected')),
    ai_decision VARCHAR(32),
    ai_response_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ban_appeals_fp ON public.ban_appeals(device_fingerprint);

-- 6. Enable RLS
ALTER TABLE public.ai_report_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Allow submitting reports" ON public.reports;
CREATE POLICY "Allow submitting reports" ON public.reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow reading reports" ON public.reports;
CREATE POLICY "Allow reading reports" ON public.reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow reading ai resolutions" ON public.ai_report_resolutions;
CREATE POLICY "Allow reading ai resolutions" ON public.ai_report_resolutions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow inserting ai resolutions" ON public.ai_report_resolutions;
CREATE POLICY "Allow inserting ai resolutions" ON public.ai_report_resolutions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read device bans" ON public.device_bans;
CREATE POLICY "Public read device bans" ON public.device_bans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert and update device bans" ON public.device_bans;
CREATE POLICY "Allow insert and update device bans" ON public.device_bans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert user violations" ON public.user_violations;
CREATE POLICY "Allow insert user violations" ON public.user_violations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read user violations" ON public.user_violations;
CREATE POLICY "Allow read user violations" ON public.user_violations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert ban appeals" ON public.ban_appeals;
CREATE POLICY "Allow insert ban appeals" ON public.ban_appeals FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read ban appeals" ON public.ban_appeals;
CREATE POLICY "Allow read ban appeals" ON public.ban_appeals FOR SELECT USING (true);
