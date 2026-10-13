-- ============================================================================
-- TALA PLATFORM — EPHEMERAL NOTES (24H EXPIRY) & SINGLE ACTIVE NOTE REPLACEMENT
-- ============================================================================

-- 1. Ensure DELETE policies exist for thoughts, comments, and reactions
DROP POLICY IF EXISTS "Allow deleting thoughts" ON public.thoughts;
CREATE POLICY "Allow deleting thoughts" ON public.thoughts
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow deleting comments" ON public.comments;
CREATE POLICY "Allow deleting comments" ON public.comments
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow deleting reactions" ON public.reactions;
CREATE POLICY "Allow deleting reactions" ON public.reactions
FOR DELETE USING (true);

-- 2. Function and trigger: when a user posts a new note:
--    - Delete their old note(s) from Supabase (cascading to comments, reactions, saved_thoughts)
--    - Purge any thoughts older than 24 hours
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
