import { Thought } from '../entities/Thought';
import { Comment } from '../entities/Comment';
import { ReportReason } from '../entities/Report';
import { Alias } from '../entities/Alias';

export interface GetFeedFilter {
  locationId?: string;
  region?: string;
  province?: string;
  category?: string;
  searchQuery?: string;
}

export interface IThoughtRepository {
  getFeed(filter?: GetFeedFilter): Promise<Thought[]>;
  createThought(params: Omit<Thought, 'id' | 'createdAtISO' | 'reactions' | 'commentCount'>): Promise<Thought>;
  reactToThought(thoughtId: string, reactionType: 'heart' | 'relate' | 'support'): Promise<Thought>;
  
  // Phase 3 Extensions
  getComments(thoughtId: string): Promise<Comment[]>;
  addComment(thoughtId: string, authorAlias: Alias, body: string): Promise<Comment>;
  toggleSaveThought(thoughtId: string): Promise<boolean>;
  reportContent(targetType: 'thought' | 'comment', targetId: string, reason: ReportReason, details?: string): Promise<void>;
}
