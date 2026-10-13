-- Phase 6 Migration: Moderation Queue, Actions & User Blocking
-- Tala Platform

-- 1. Blocked Users Table (User safety & alias blocking)
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_alias_id UUID NOT NULL REFERENCES public.aliases(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_block UNIQUE (blocker_profile_id, blocked_alias_id)
);

-- 2. Moderation Actions Log Table
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

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Blocked Users Policies
CREATE POLICY "Users manage own blocked list"
    ON public.blocked_users FOR ALL
    USING (auth.uid() = blocker_profile_id);

-- Moderation Actions Policies (Staff only)
CREATE POLICY "Staff read moderation actions"
    ON public.moderation_actions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'moderator', 'superadmin')
        )
    );

CREATE POLICY "Staff insert moderation actions"
    ON public.moderation_actions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'moderator', 'superadmin')
        )
    );
