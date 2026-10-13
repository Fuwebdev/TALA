-- Phase 2 — Supabase Database & Anonymous Identity Migration with Full RLS
-- Tala Platform — Anonymous, location-based student thoughts platform for the Philippines

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Location Administrative Hierarchy Tables
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

-- Index location searching
CREATE INDEX IF NOT EXISTS idx_cities_province_id ON public.cities_municipalities(province_id);
CREATE INDEX IF NOT EXISTS idx_provinces_region_id ON public.provinces(region_id);

-- 3. Profiles Table (Internal user record linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(32) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Aliases Table (Publicly exposed anonymous handle per student)
CREATE TABLE IF NOT EXISTS public.aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    display_name VARCHAR(64) NOT NULL UNIQUE,
    avatar_seed VARCHAR(64) NOT NULL,
    badge VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aliases_profile_id ON public.aliases(profile_id);
CREATE INDEX IF NOT EXISTS idx_aliases_display_name ON public.aliases(display_name);

-- 5. User Preferences Table (Private to user)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme VARCHAR(16) DEFAULT 'dark' NOT NULL,
    notify_replies BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Thoughts Table
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

-- 7. Reactions Table
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(16) NOT NULL CHECK (type IN ('heart', 'relate', 'support')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_thought_reaction UNIQUE (thought_id, profile_id, type)
);

-- 8. Audit Logs Table (Safety & Admin tracking)
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all public tables
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities_municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Locations Policies (Publicly readable by all)
CREATE POLICY "Allow public read access to regions"
    ON public.regions FOR SELECT USING (true);

CREATE POLICY "Allow public read access to provinces"
    ON public.provinces FOR SELECT USING (true);

CREATE POLICY "Allow public read access to cities_municipalities"
    ON public.cities_municipalities FOR SELECT USING (true);

-- 2. Profiles Policies
-- Users can only read their own profile (privacy baseline)
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 3. Aliases Policies
-- Active aliases are publicly readable (for author display on thoughts)
CREATE POLICY "Allow public read access to active aliases"
    ON public.aliases FOR SELECT
    USING (is_active = true);

-- Users can insert and manage their own alias
CREATE POLICY "Users can insert own alias"
    ON public.aliases FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own alias"
    ON public.aliases FOR UPDATE
    USING (auth.uid() = profile_id);

-- 4. User Preferences Policies
CREATE POLICY "Users manage own preferences"
    ON public.user_preferences FOR ALL
    USING (auth.uid() = profile_id);

-- 5. Thoughts Policies
-- Anyone (authenticated or anonymous visitors) can read published thoughts
CREATE POLICY "Allow public read access to published thoughts"
    ON public.thoughts FOR SELECT
    USING (status = 'published');

-- Authenticated users can create thoughts
CREATE POLICY "Authenticated users can create thoughts"
    ON public.thoughts FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.aliases
            WHERE id = author_alias_id AND profile_id = auth.uid()
        )
    );

-- Authors can update or soft-delete their own thoughts
CREATE POLICY "Authors can update own thoughts"
    ON public.thoughts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.aliases
            WHERE id = author_alias_id AND profile_id = auth.uid()
        )
    );

-- 6. Reactions Policies
CREATE POLICY "Allow public read access to reactions"
    ON public.reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage own reactions"
    ON public.reactions FOR ALL
    USING (auth.uid() = profile_id);

-- 7. Audit Logs Policies
-- Only staff (admin/superadmin) can read audit logs
CREATE POLICY "Admins can read audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Insert into audit_logs allowed for service role or authenticated actions
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
