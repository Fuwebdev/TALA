-- ============================================================================
-- TALA PLATFORM — MASTER SUPABASE SQL SCHEMA & RLS POLICIES
-- Product Principle: "Leave a thought where you are."
-- Anonymous, location-based student thoughts platform for the Philippines
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
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at ASC);

-- Reactions (Heart, Relate, Support)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(16) NOT NULL CHECK (type IN ('heart', 'relate', 'support')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Saved Thoughts (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_saved_thought UNIQUE (profile_id, thought_id)
);

-- ----------------------------------------------------------------------------
-- 5. MODERATION, SAFETY & AUDIT LOG TABLES
-- ----------------------------------------------------------------------------
-- Content Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- Blocked Users / Aliases
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_alias_id UUID NOT NULL REFERENCES public.aliases(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_block UNIQUE (blocker_profile_id, blocked_alias_id)
);

-- Moderation Actions Log
CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('thought', 'comment', 'alias')),
    target_id UUID NOT NULL,
    action_taken VARCHAR(32) NOT NULL CHECK (action_taken IN ('approved', 'removed', 'flagged', 'warned_user', 'banned_alias')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- System Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) ENFORCEMENT & POLICIES
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
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script
DROP POLICY IF EXISTS "Allow public read access to regions" ON public.regions;
DROP POLICY IF EXISTS "Allow public insert access to regions" ON public.regions;
DROP POLICY IF EXISTS "Allow public read access to provinces" ON public.provinces;
DROP POLICY IF EXISTS "Allow public insert access to provinces" ON public.provinces;
DROP POLICY IF EXISTS "Allow public read access to cities_municipalities" ON public.cities_municipalities;
DROP POLICY IF EXISTS "Allow public insert access to cities_municipalities" ON public.cities_municipalities;
DROP POLICY IF EXISTS "Allow public read access to active aliases" ON public.aliases;
DROP POLICY IF EXISTS "Allow public read access to published thoughts" ON public.thoughts;
DROP POLICY IF EXISTS "Allow public read access to published comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public read access to reactions" ON public.reactions;
DROP POLICY IF EXISTS "Allow public insert access to reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own alias" ON public.aliases;
DROP POLICY IF EXISTS "Users can update own alias" ON public.aliases;
DROP POLICY IF EXISTS "Users manage own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Authenticated users can create thoughts" ON public.thoughts;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to create thoughts" ON public.thoughts;
DROP POLICY IF EXISTS "Authors can update own thoughts" ON public.thoughts;
DROP POLICY IF EXISTS "Authenticated users insert comments" ON public.comments;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to insert comments" ON public.comments;

-- Public Read & Dynamic Location Registration Policies
CREATE POLICY "Allow public read access to regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to regions" ON public.regions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to provinces" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to provinces" ON public.provinces FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to cities_municipalities" ON public.cities_municipalities FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to cities_municipalities" ON public.cities_municipalities FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to active aliases" ON public.aliases FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public read access to published thoughts" ON public.thoughts FOR SELECT USING (status = 'published');
CREATE POLICY "Allow public read access to published comments" ON public.comments FOR SELECT USING (status = 'published');
CREATE POLICY "Allow public read access to reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to reactions" ON public.reactions FOR INSERT WITH CHECK (true);

-- Profile & Alias Policies
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own alias" ON public.aliases FOR INSERT
WITH CHECK (profile_id IS NULL OR auth.uid() = profile_id);

CREATE POLICY "Users can update own alias" ON public.aliases FOR UPDATE
USING (profile_id IS NULL OR auth.uid() = profile_id);

CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = profile_id);

-- Thoughts & Comments Insertion Policies
CREATE POLICY "Allow anonymous and authenticated users to create thoughts" ON public.thoughts FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.aliases
        WHERE id = author_alias_id AND is_active = true
    )
);

CREATE POLICY "Authors can update own thoughts" ON public.thoughts FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.aliases
        WHERE id = author_alias_id AND (profile_id = auth.uid() OR profile_id IS NULL)
    )
);

CREATE POLICY "Allow anonymous and authenticated users to insert comments" ON public.comments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.aliases
        WHERE id = author_alias_id AND is_active = true
    )
);

-- ============================================================================
-- 7. INITIAL PHILIPPINE LOCATION SEED DATA
-- ============================================================================
INSERT INTO public.regions (code, name) VALUES
('NCR', 'National Capital Region (NCR)'),
('CAR', 'Cordillera Administrative Region (CAR)'),
('R01', 'Region I (Ilocos Region)'),
('R03', 'Region III (Central Luzon)'),
('R04A', 'Region IV-A (CALABARZON)'),
('R06', 'Region VI (Western Visayas)'),
('R07', 'Region VII (Central Visayas)'),
('R10', 'Region X (Northern Mindanao)'),
('R11', 'Region XI (Davao Region)')
ON CONFLICT (code) DO NOTHING;

-- Seed Provinces
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

-- Seed Cities & Municipalities
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

-- ----------------------------------------------------------------------------
-- 8. EPHEMERAL NOTES (24H EXPIRATION) & SINGLE ACTIVE NOTE REPLACEMENT
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow deleting thoughts" ON public.thoughts;
CREATE POLICY "Allow deleting thoughts" ON public.thoughts FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow deleting comments" ON public.comments;
CREATE POLICY "Allow deleting comments" ON public.comments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow deleting reactions" ON public.reactions;
CREATE POLICY "Allow deleting reactions" ON public.reactions FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_thought_and_ephemeral_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically delete previous thoughts from the same author alias
    DELETE FROM public.thoughts
    WHERE author_alias_id = NEW.author_alias_id
      AND id != NEW.id;

    -- Automatically purge expired thoughts older than 24 hours
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

