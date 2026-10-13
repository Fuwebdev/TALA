-- Phase 3 Migration: Comments, Reactions, Saved Thoughts & Content Reports
-- Tala Platform

-- 1. Comments Table
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

-- 2. Saved Thoughts Table (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_saved_thought UNIQUE (profile_id, thought_id)
);

-- 3. Reports Table (Content moderation)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- Enable RLS on Phase 3 tables
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Comments
CREATE POLICY "Public read published comments"
    ON public.comments FOR SELECT
    USING (status = 'published');

CREATE POLICY "Authenticated users insert comments"
    ON public.comments FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.aliases
            WHERE id = author_alias_id AND profile_id = auth.uid()
        )
    );

-- RLS Policies for Saved Thoughts
CREATE POLICY "Users manage own saved thoughts"
    ON public.saved_thoughts FOR ALL
    USING (auth.uid() = profile_id);

-- RLS Policies for Reports
CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_profile_id);

CREATE POLICY "Admins read reports"
    ON public.reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'moderator', 'superadmin')
        )
    );
