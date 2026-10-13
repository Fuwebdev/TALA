import { IThoughtRepository, GetFeedFilter } from '../../domain/repositories/IThoughtRepository';
import { Thought } from '../../domain/entities/Thought';
import { Comment } from '../../domain/entities/Comment';
import { ReportReason } from '../../domain/entities/Report';
import { Alias } from '../../domain/entities/Alias';
import { PHILIPPINE_LOCATIONS } from './MockLocationRepository';

const INITIAL_THOUGHTS: Thought[] = [
  {
    id: 'thought-101',
    authorAlias: {
      id: 'alias-1',
      displayName: 'MidnightThinker_482',
      avatarSeed: 'MidnightThinker_482',
      badge: 'Pioneer',
    },
    category: 'School',
    body: 'Midterms week in Diliman starts tomorrow! Library is packed. Sending coffee energy to everyone pulling all-nighters. Stay hydrated! ☕📖',
    location: PHILIPPINE_LOCATIONS[0], // Quezon City
    createdAtISO: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    reactions: { heart: 14, relate: 29, support: 8 },
    commentCount: 2,
  },
  {
    id: 'thought-102',
    authorAlias: {
      id: 'alias-2',
      displayName: 'CoastalWanderer_910',
      avatarSeed: 'CoastalWanderer_910',
    },
    category: 'Environment',
    body: 'Noticed high tide mixed with heavy plastic debris along the shoreline after yesterday’s rain. Planning a weekend coastal cleanup! Who’s near IT Park / SRP area?',
    location: PHILIPPINE_LOCATIONS[2], // Cebu City
    createdAtISO: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    reactions: { heart: 22, relate: 5, support: 34 },
    commentCount: 1,
    isEnvironmentalAlert: true,
  },
];

const MOCK_COMMENTS: Record<string, Comment[]> = {
  'thought-101': [
    {
      id: 'c-1',
      thoughtId: 'thought-101',
      authorAlias: { id: 'a-10', displayName: 'QuietScholar_102', avatarSeed: 'Quiet' },
      body: 'Main Library 3rd floor quiet zone has vacant seats right now! Good luck everyone!',
      createdAtISO: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      status: 'published',
    },
    {
      id: 'c-2',
      thoughtId: 'thought-101',
      authorAlias: { id: 'a-11', displayName: 'CuriousThinker_991', avatarSeed: 'Curious' },
      body: 'Manifesting 1.0 grade for all of us! Let us power through math analysis! 💯',
      createdAtISO: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'published',
    }
  ],
  'thought-102': [
    {
      id: 'c-3',
      thoughtId: 'thought-102',
      authorAlias: { id: 'a-12', displayName: 'EcoWanderer_303', avatarSeed: 'Eco' },
      body: 'Count me in! I will bring extra biodegradable trash bags and gloves. See you Saturday 7AM!',
      createdAtISO: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      status: 'published',
    }
  ]
};

export class MockThoughtRepository implements IThoughtRepository {
  private thoughts: Thought[] = [...INITIAL_THOUGHTS];
  private comments: Record<string, Comment[]> = { ...MOCK_COMMENTS };
  private savedThoughtIds: Set<string> = new Set();

  async getFeed(filter?: GetFeedFilter): Promise<Thought[]> {
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    // Filter out expired notes older than 24 hours
    let result = this.thoughts.filter(
      (t) => now - new Date(t.createdAtISO).getTime() <= TWENTY_FOUR_HOURS_MS
    );

    if (filter?.category && filter.category !== 'All') {
      result = result.filter(t => t.category === filter.category);
    }

    if (filter?.locationId) {
      result = result.filter(t => t.location.id === filter.locationId);
    }

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.body.toLowerCase().includes(q) ||
          t.authorAlias.displayName.toLowerCase().includes(q) ||
          t.location.cityMunicipality.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime());
  }

  async createThought(params: Omit<Thought, 'id' | 'createdAtISO' | 'reactions' | 'commentCount'>): Promise<Thought> {
    // Automatically delete old thoughts and comments from the same author so only latest note is kept
    const oldThoughts = this.thoughts.filter(
      (t) =>
        t.authorAlias.displayName.toLowerCase() === params.authorAlias.displayName.toLowerCase() ||
        t.authorAlias.id === params.authorAlias.id
    );
    for (const old of oldThoughts) {
      delete this.comments[old.id];
      this.savedThoughtIds.delete(old.id);
    }
    this.thoughts = this.thoughts.filter(
      (t) =>
        t.authorAlias.displayName.toLowerCase() !== params.authorAlias.displayName.toLowerCase() &&
        t.authorAlias.id !== params.authorAlias.id
    );

    const newThought: Thought = {
      ...params,
      id: `thought-${Date.now()}`,
      createdAtISO: new Date().toISOString(),
      reactions: { heart: 0, relate: 0, support: 0 },
      commentCount: 0,
    };
    this.thoughts.unshift(newThought);
    return newThought;
  }

  async reactToThought(thoughtId: string, reactionType: 'heart' | 'relate' | 'support'): Promise<Thought> {
    const thought = this.thoughts.find(t => t.id === thoughtId);
    if (!thought) {
      // Return a safe dummy update rather than throwing if the thought exists only in Supabase
      return {
        id: thoughtId,
        authorAlias: { id: 'anon', displayName: 'Anonymous', avatarSeed: 'Anon' },
        category: 'Thoughts',
        body: '',
        location: PHILIPPINE_LOCATIONS[0],
        createdAtISO: new Date().toISOString(),
        reactions: { heart: reactionType === 'heart' ? 1 : 0, relate: reactionType === 'relate' ? 1 : 0, support: reactionType === 'support' ? 1 : 0 },
        commentCount: 0,
      };
    }
    thought.reactions[reactionType] += 1;
    return { ...thought };
  }

  async getComments(thoughtId: string): Promise<Comment[]> {
    return this.comments[thoughtId] || [];
  }

  async addComment(thoughtId: string, authorAlias: Alias, body: string): Promise<Comment> {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      thoughtId,
      authorAlias,
      body,
      createdAtISO: new Date().toISOString(),
      status: 'published',
    };
    if (!this.comments[thoughtId]) {
      this.comments[thoughtId] = [];
    }
    this.comments[thoughtId].push(newComment);

    const thought = this.thoughts.find(t => t.id === thoughtId);
    if (thought) {
      thought.commentCount += 1;
    }

    return newComment;
  }

  async toggleSaveThought(thoughtId: string): Promise<boolean> {
    if (this.savedThoughtIds.has(thoughtId)) {
      this.savedThoughtIds.delete(thoughtId);
      return false;
    } else {
      this.savedThoughtIds.add(thoughtId);
      return true;
    }
  }

  async reportContent(targetType: 'thought' | 'comment', targetId: string, reason: ReportReason, details?: string): Promise<void> {
    console.log(`[Safety Report Submitted] Target: ${targetType} #${targetId} | Reason: ${reason} | Details: ${details || 'None'}`);
  }
}
