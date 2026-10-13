import { IThoughtRepository, GetFeedFilter } from '../../domain/repositories/IThoughtRepository';
import { Thought, ThoughtReactionCount } from '../../domain/entities/Thought';
import { Comment } from '../../domain/entities/Comment';
import { ReportReason } from '../../domain/entities/Report';
import { Alias } from '../../domain/entities/Alias';
import { supabase } from '../supabase/client';
import { MockThoughtRepository } from './MockThoughtRepository';

const LOCAL_REACTIONS_KEY = 'tala_local_reaction_counts_v1';

export class SupabaseThoughtRepository implements IThoughtRepository {
  private fallbackMock = new MockThoughtRepository();

  private getLocalReactionBonus(thoughtId: string): ThoughtReactionCount {
    try {
      const raw = localStorage.getItem(LOCAL_REACTIONS_KEY);
      if (!raw) return { heart: 0, relate: 0, support: 0 };
      const map = JSON.parse(raw);
      return map[thoughtId] || { heart: 0, relate: 0, support: 0 };
    } catch {
      return { heart: 0, relate: 0, support: 0 };
    }
  }

  private incrementLocalReactionBonus(thoughtId: string, reactionType: 'heart' | 'relate' | 'support'): void {
    try {
      const raw = localStorage.getItem(LOCAL_REACTIONS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (!map[thoughtId]) {
        map[thoughtId] = { heart: 0, relate: 0, support: 0 };
      }
      map[thoughtId][reactionType] += 1;
      localStorage.setItem(LOCAL_REACTIONS_KEY, JSON.stringify(map));
    } catch (err) {
      console.warn('Could not save reaction locally:', err);
    }
  }

  /**
   * Ensures the user's profile and active alias exist in Supabase before inserting a thought or comment.
   */
  private async ensureAliasPersisted(alias: Alias): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const { data: existingAlias } = await supabase
      .from('aliases')
      .select('id')
      .eq('display_name', alias.displayName)
      .maybeSingle();

    if (existingAlias?.id) {
      return existingAlias.id;
    }

    if (userId) {
      await supabase
        .from('profiles')
        .upsert({ id: userId, role: 'user' }, { onConflict: 'id' });
    }

    const { data: createdAlias, error: aliasError } = await supabase
      .from('aliases')
      .upsert(
        {
          id: alias.id,
          profile_id: userId || null,
          display_name: alias.displayName,
          avatar_seed: alias.avatarSeed,
          badge: alias.badge || null,
          is_active: true,
        },
        { onConflict: 'display_name' }
      )
      .select('id')
      .single();

    if (aliasError) {
      console.warn('[Supabase] Alias persistence warning:', aliasError.message);
      return alias.id;
    }

    return createdAlias?.id || alias.id;
  }

  async getFeed(filter?: GetFeedFilter): Promise<Thought[]> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Opportunistically purge expired thoughts older than 24 hours in Supabase
      supabase
        .from('thoughts')
        .delete()
        .lt('created_at', twentyFourHoursAgo)
        .then(() => {}, () => {});

      let query = supabase
        .from('thoughts')
        .select(`
          id,
          category,
          body,
          is_environmental_alert,
          created_at,
          author_alias:aliases (
            id,
            display_name,
            avatar_seed,
            badge
          ),
          location:cities_municipalities (
            id,
            name,
            province:provinces (
              name,
              region:regions (
                name
              )
            ),
            latitude,
            longitude
          ),
          reactions (
            type
          ),
          comments (
            id
          )
        `)
        .eq('status', 'published')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (filter?.category && filter.category !== 'All') {
        query = query.eq('category', filter.category);
      }

      if (filter?.locationId) {
        query = query.eq('city_municipality_id', filter.locationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Supabase] getFeed error:', error.message);
        return this.fallbackMock.getFeed(filter);
      }

      if (!data || data.length === 0) {
        return this.fallbackMock.getFeed(filter);
      }

      const now = Date.now();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

      let mapped: Thought[] = data
        .filter((item: any) => now - new Date(item.created_at).getTime() <= TWENTY_FOUR_HOURS_MS)
        .map((item: any) => {
          const dbReactions = Array.isArray(item.reactions) ? item.reactions : [];
          const dbHeart = dbReactions.filter((r: any) => r.type === 'heart').length;
          const dbRelate = dbReactions.filter((r: any) => r.type === 'relate').length;
          const dbSupport = dbReactions.filter((r: any) => r.type === 'support').length;
          const localBonus = this.getLocalReactionBonus(item.id);

          return {
            id: item.id,
            authorAlias: {
              id: item.author_alias?.id || 'anon',
              displayName: item.author_alias?.display_name || 'AnonymousStudent',
              avatarSeed: item.author_alias?.avatar_seed || 'Anon',
              badge: item.author_alias?.badge,
            },
            category: item.category,
            body: item.body,
            location: {
              id: item.location?.id || 'loc-1',
              region: item.location?.province?.region?.name || 'Philippines',
              province: item.location?.province?.name || 'Local Province',
              cityMunicipality: item.location?.name || 'Local City',
              coordinates: {
                lat: Number(item.location?.latitude || 14.6760),
                lng: Number(item.location?.longitude || 121.0437),
              },
            },
            createdAtISO: item.created_at,
            reactions: {
              heart: dbHeart + localBonus.heart,
              relate: dbRelate + localBonus.relate,
              support: dbSupport + localBonus.support,
            },
            commentCount: Array.isArray(item.comments) ? item.comments.length : 0,
            isEnvironmentalAlert: item.is_environmental_alert,
          };
        });

      if (filter?.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        mapped = mapped.filter(
          t =>
            t.body.toLowerCase().includes(q) ||
            t.authorAlias.displayName.toLowerCase().includes(q) ||
            t.location.cityMunicipality.toLowerCase().includes(q)
        );
      }

      return mapped;
    } catch (err) {
      console.error('[Supabase] getFeed exception:', err);
      return this.fallbackMock.getFeed(filter);
    }
  }

  async createThought(params: Omit<Thought, 'id' | 'createdAtISO' | 'reactions' | 'commentCount'>): Promise<Thought> {
    try {
      const persistedAliasId = await this.ensureAliasPersisted(params.authorAlias);

      // Automatically delete any old note(s) from this author in Supabase along with comments and reactions
      try {
        const { data: oldThoughts } = await supabase
          .from('thoughts')
          .select('id')
          .eq('author_alias_id', persistedAliasId);

        if (oldThoughts && oldThoughts.length > 0) {
          const oldIds = oldThoughts.map((t: any) => t.id);
          // Delete cascade data (reactions, comments, saved thoughts, reports)
          await supabase.from('reactions').delete().in('thought_id', oldIds);
          await supabase.from('comments').delete().in('thought_id', oldIds);
          await supabase.from('saved_thoughts').delete().in('thought_id', oldIds);
          await supabase.from('reports').delete().eq('target_type', 'thought').in('target_id', oldIds);
          // Delete old thoughts from database
          await supabase.from('thoughts').delete().in('id', oldIds);
        }
      } catch (cleanErr) {
        console.warn('[Supabase] Old thoughts cleanup notice:', cleanErr);
      }

      // Also clean up in fallback mock repository
      await this.fallbackMock.createThought(params);

      const { data, error } = await supabase
        .from('thoughts')
        .insert({
          category: params.category,
          body: params.body,
          city_municipality_id: params.location.id,
          is_environmental_alert: params.isEnvironmentalAlert || false,
          author_alias_id: persistedAliasId,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase] Failed to insert thought into database:', error?.message, error?.details);
        return this.fallbackMock.createThought(params);
      }

      return {
        ...params,
        id: data.id,
        createdAtISO: data.created_at,
        reactions: { heart: 0, relate: 0, support: 0 },
        commentCount: 0,
      };
    } catch (err) {
      console.error('[Supabase] createThought exception:', err);
      return this.fallbackMock.createThought(params);
    }
  }

  async reactToThought(thoughtId: string, reactionType: 'heart' | 'relate' | 'support'): Promise<Thought> {
    // Check if it's a mock thought ID
    if (thoughtId.startsWith('thought-')) {
      return this.fallbackMock.reactToThought(thoughtId, reactionType);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const { error } = await supabase.from('reactions').insert({
        thought_id: thoughtId,
        profile_id: userId,
        type: reactionType,
      });

      if (error) {
        // Fallback to localStorage counter if RLS blocks unauthenticated reaction insert
        this.incrementLocalReactionBonus(thoughtId, reactionType);
      }
    } catch {
      this.incrementLocalReactionBonus(thoughtId, reactionType);
    }

    return this.fallbackMock.reactToThought(thoughtId, reactionType);
  }

  async getComments(thoughtId: string): Promise<Comment[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          thought_id,
          body,
          created_at,
          status,
          author_alias:aliases (
            id,
            display_name,
            avatar_seed
          )
        `)
        .eq('thought_id', thoughtId)
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return this.fallbackMock.getComments(thoughtId);
      }

      return data.map((item: any) => ({
        id: item.id,
        thoughtId: item.thought_id,
        authorAlias: {
          id: item.author_alias?.id || 'anon',
          displayName: item.author_alias?.display_name || 'AnonymousStudent',
          avatarSeed: item.author_alias?.avatar_seed || 'Anon',
        },
        body: item.body,
        createdAtISO: item.created_at,
        status: item.status,
      }));
    } catch {
      return this.fallbackMock.getComments(thoughtId);
    }
  }

  async addComment(thoughtId: string, authorAlias: Alias, body: string): Promise<Comment> {
    try {
      const persistedAliasId = await this.ensureAliasPersisted(authorAlias);

      const { data, error } = await supabase
        .from('comments')
        .insert({
          thought_id: thoughtId,
          author_alias_id: persistedAliasId,
          body,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase] Failed to insert comment:', error?.message);
        return this.fallbackMock.addComment(thoughtId, authorAlias, body);
      }

      return {
        id: data.id,
        thoughtId,
        authorAlias,
        body,
        createdAtISO: data.created_at,
        status: 'published',
      };
    } catch {
      return this.fallbackMock.addComment(thoughtId, authorAlias, body);
    }
  }

  async toggleSaveThought(thoughtId: string): Promise<boolean> {
    return this.fallbackMock.toggleSaveThought(thoughtId);
  }

  async reportContent(targetType: 'thought' | 'comment', targetId: string, reason: ReportReason, details?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.fallbackMock.reportContent(targetType, targetId, reason, details);
      }

      await supabase.from('reports').insert({
        reporter_profile_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details,
      });
    } catch {
      return this.fallbackMock.reportContent(targetType, targetId, reason, details);
    }
  }
}
