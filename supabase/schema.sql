-- ============================================================================
-- TALA PLATFORM — MASTER SUPABASE SQL SCHEMA & RLS POLICIES (LATEST UPDATE)
-- Product Principle: "Leave a thought where you are."
-- Anonymous, location-based student & community thoughts platform for the Philippines
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. ADMINISTRATIVE LOCATION HIERARCHY TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cities_municipalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cities_province_id ON public.cities_municipalities(province_id);
CREATE INDEX IF NOT EXISTS idx_provinces_region_id ON public.provinces(region_id);
CREATE INDEX IF NOT EXISTS idx_cities_coords ON public.cities_municipalities(latitude, longitude);

-- ----------------------------------------------------------------------------
-- 3. USER PROFILES & ANONYMOUS IDENTITY TABLES
-- ----------------------------------------------------------------------------
-- Internal account profile (Linked 1:1 with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(32) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Publicly exposed student handle/alias (Protects real identities)
CREATE TABLE IF NOT EXISTS public.aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    display_name VARCHAR(64) NOT NULL UNIQUE,
    avatar_seed VARCHAR(64) NOT NULL,
    badge VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.aliases ALTER COLUMN profile_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_aliases_profile_id ON public.aliases(profile_id);
CREATE INDEX IF NOT EXISTS idx_aliases_display_name ON public.aliases(display_name);

-- User Preferences (Private settings)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme VARCHAR(16) DEFAULT 'dark' NOT NULL,
    notify_replies BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. THOUGHTS, COMMENTS & REACTIONS TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_alias_id UUID NOT NULL REFERENCES public.aliases(id) ON DELETE RESTRICT,
    category VARCHAR(32) NOT NULL CHECK (category IN ('Thoughts', 'School', 'Life', 'Community', 'Environment')),
    body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
    city_municipality_id UUID NOT NULL REFERENCES public.cities_municipalities(id) ON DELETE RESTRICT,
    is_environmental_alert BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(32) DEFAULT 'published' NOT NULL CHECK (status IN ('published', 'flagged', 'under_review', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_thoughts_location ON public.thoughts(city_municipality_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_author_alias ON public.thoughts(author_alias_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_category ON public.thoughts(category);
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON public.thoughts(created_at DESC);

-- Comments Thread Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    author_alias_id UUID NOT NULL REFERENCES public.aliases(id) ON DELETE RESTRICT,
    body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 300),
    status VARCHAR(32) DEFAULT 'published' NOT NULL CHECK (status IN ('published', 'flagged', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_thought_id ON public.comments(thought_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_alias ON public.comments(author_alias_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at ASC);

-- Reactions (Heart, Relate, Support)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(16) NOT NULL CHECK (type IN ('heart', 'relate', 'support')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reactions_thought_id ON public.reactions(thought_id);

-- Saved Thoughts (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_saved_thought UNIQUE (profile_id, thought_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_thoughts_profile ON public.saved_thoughts(profile_id);

-- ----------------------------------------------------------------------------
-- 5. USER BLOCKS & REPORTING TABLES
-- ----------------------------------------------------------------------------
-- User Blocks (Alias to Alias block)
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_alias_id VARCHAR(128) NOT NULL,
    blocked_alias_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_alias_block UNIQUE (blocker_alias_id, blocked_alias_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_alias_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_alias_id);

-- Content Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reporter_alias_id VARCHAR(128),
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('thought', 'comment')),
    target_id UUID NOT NULL,
    reason VARCHAR(64) NOT NULL CHECK (reason IN (
        'Harassment', 'Threats', 'Hate or discrimination', 
        'Sexual content', 'Self-harm concern', 'Spam/scam', 
        'Personal information', 'Illegal content', 'Other'
    )),
    details TEXT,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);

-- AI Automated Report Resolutions Log
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

-- ----------------------------------------------------------------------------
-- 6. MULTI-STORE HARDWARE DEVICE BANS & PROGRESSIVE STRIKES
-- ----------------------------------------------------------------------------
-- Device Ban Registry (Canvas/WebGL hardware fingerprint with progressive suspensions)
CREATE TABLE IF NOT EXISTS public.device_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint VARCHAR(128) NOT NULL UNIQUE,
    strike_count INT DEFAULT 1 NOT NULL,
    ban_level INT DEFAULT 0 NOT NULL, -- 0 = warning, 1 = 24h, 2 = 3d, 3 = 7d, 4 = permanent
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

-- User Violations History (Profanity and abuse strikes audit log)
CREATE TABLE IF NOT EXISTS public.user_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint VARCHAR(128) NOT NULL,
    alias_id VARCHAR(128),
    alias_name VARCHAR(128),
    violation_reason TEXT NOT NULL,
    content_snippet TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_violations_fp ON public.user_violations(device_fingerprint);

-- Ban Appeals Table (Evaluated in real-time by OpenRouter AI openai/gpt-4o-mini)
CREATE TABLE IF NOT EXISTS public.ban_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint VARCHAR(128) NOT NULL,
    appeal_reason TEXT NOT NULL,
    alias_name VARCHAR(128),
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('APPROVED', 'DENIED')),
    ai_explanation TEXT NOT NULL,
    confidence_score NUMERIC(5, 4) DEFAULT 0.9 NOT NULL,
    strike_count_before INT DEFAULT 3 NOT NULL,
    ban_level_before INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ban_appeals_fp ON public.ban_appeals(device_fingerprint);

-- Moderation Actions Log (Internal Audit)
CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_profile_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('thought', 'comment', 'alias', 'device')),
    target_id VARCHAR(128) NOT NULL,
    action_taken VARCHAR(32) NOT NULL CHECK (action_taken IN ('approved', 'removed', 'flagged', 'warned_user', 'banned_alias', 'locked_device')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities_municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_report_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- 1. Locations: Anyone can read, users can insert new geocoded locations
CREATE POLICY "Public read regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Public insert regions" ON public.regions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read provinces" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "Public insert provinces" ON public.provinces FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read cities" ON public.cities_municipalities FOR SELECT USING (true);
CREATE POLICY "Public insert cities" ON public.cities_municipalities FOR INSERT WITH CHECK (true);

-- 2. Aliases: Anonymous users can create and read public aliases
CREATE POLICY "Public read aliases" ON public.aliases FOR SELECT USING (true);
CREATE POLICY "Allow anonymous create aliases" ON public.aliases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own alias" ON public.aliases FOR UPDATE USING (true);

-- 3. Thoughts: Read, Create, Edit, Delete
CREATE POLICY "Public read published thoughts" ON public.thoughts FOR SELECT USING (status != 'removed');
CREATE POLICY "Allow creating thoughts" ON public.thoughts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updating thoughts" ON public.thoughts FOR UPDATE USING (true);
CREATE POLICY "Allow deleting thoughts" ON public.thoughts FOR DELETE USING (true);

-- 4. Comments: Read, Create, Delete
CREATE POLICY "Public read comments" ON public.comments FOR SELECT USING (status != 'removed');
CREATE POLICY "Allow creating comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow deleting comments" ON public.comments FOR DELETE USING (true);

-- 5. Reactions: Read, Create, Delete
CREATE POLICY "Public read reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Allow creating reactions" ON public.reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow deleting reactions" ON public.reactions FOR DELETE USING (true);

-- 6. Saved Thoughts (Bookmarks)
CREATE POLICY "Allow read saved thoughts" ON public.saved_thoughts FOR SELECT USING (true);
CREATE POLICY "Allow insert saved thoughts" ON public.saved_thoughts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete saved thoughts" ON public.saved_thoughts FOR DELETE USING (true);

-- 7. User Blocks
CREATE POLICY "Allow reading user blocks" ON public.user_blocks FOR SELECT USING (true);
CREATE POLICY "Allow inserting user blocks" ON public.user_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow deleting user blocks" ON public.user_blocks FOR DELETE USING (true);

-- 8. Content Reports & AI Resolutions
CREATE POLICY "Allow submitting reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow reading reports" ON public.reports FOR SELECT USING (true);

CREATE POLICY "Allow reading ai resolutions" ON public.ai_report_resolutions FOR SELECT USING (true);
CREATE POLICY "Allow inserting ai resolutions" ON public.ai_report_resolutions FOR INSERT WITH CHECK (true);

-- 9. Device Bans, Violations & Appeals
CREATE POLICY "Public read device bans" ON public.device_bans FOR SELECT USING (true);
CREATE POLICY "Allow insert and update device bans" ON public.device_bans FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert user violations" ON public.user_violations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read user violations" ON public.user_violations FOR SELECT USING (true);

CREATE POLICY "Allow insert ban appeals" ON public.ban_appeals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read ban appeals" ON public.ban_appeals FOR SELECT USING (true);

-- ============================================================================
-- 8. EPHEMERAL NOTES (24H EXPIRATION) & SINGLE ACTIVE NOTE REPLACEMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_thought_and_ephemeral_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Automatically delete previous notes from the same author alias
    DELETE FROM public.thoughts
    WHERE author_alias_id = NEW.author_alias_id
      AND id != NEW.id;

    -- 2. Automatically purge expired thoughts older than 24 hours
    DELETE FROM public.thoughts
    WHERE created_at < NOW() - INTERVAL '24 hours';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_thought_ephemeral_cleanup ON public.thoughts;
CREATE TRIGGER trigger_new_thought_ephemeral_cleanup
AFTER INSERT ON public.thoughts
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_thought_and_ephemeral_cleanup();

-- ============================================================================
-- 9. INITIAL PHILIPPINE SEED LOCATIONS (BOOTSTRAP)
-- ============================================================================
INSERT INTO public.regions (code, name) VALUES
('NCR', 'National Capital Region'),
('CAR', 'Cordillera Administrative Region'),
('R01', 'Ilocos Region'),
('R04A', 'CALABARZON'),
('R07', 'Central Visayas'),
('R11', 'Davao Region')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'MM', 'Metro Manila' FROM public.regions r WHERE r.code = 'NCR'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'BEN', 'Benguet' FROM public.regions r WHERE r.code = 'CAR'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'ILN', 'Ilocos Norte' FROM public.regions r WHERE r.code = 'R01'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'LAG', 'Laguna' FROM public.regions r WHERE r.code = 'R04A'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'CEB', 'Cebu' FROM public.regions r WHERE r.code = 'R07'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'DAV', 'Davao del Sur' FROM public.regions r WHERE r.code = 'R11'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'QC', 'Quezon City', 14.6760, 121.0437 FROM public.provinces p WHERE p.code = 'MM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'MNL', 'Manila', 14.5995, 120.9842 FROM public.provinces p WHERE p.code = 'MM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'BAG', 'Baguio City', 16.4023, 120.5960 FROM public.provinces p WHERE p.code = 'BEN'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'LAO', 'Laoag City', 18.1960, 120.5927 FROM public.provinces p WHERE p.code = 'ILN'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'CEU', 'Cebu City', 10.3157, 123.8854 FROM public.provinces p WHERE p.code = 'CEB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'DVO', 'Davao City', 7.1907, 125.4553 FROM public.provinces p WHERE p.code = 'DAV'
ON CONFLICT (code) DO NOTHING;
