import { Thought, Category } from '../entities/Thought';
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

export interface UpdateThoughtDTO {
  body: string;
  category: Category;
  isEnvironmentalAlert?: boolean;
}

export interface IThoughtRepository {
  getFeed(filter?: GetFeedFilter): Promise<Thought[]>;
  createThought(params: Omit<Thought, 'id' | 'createdAtISO' | 'reactions' | 'commentCount'>): Promise<Thought>;
  updateThought(thoughtId: string, params: UpdateThoughtDTO): Promise<Thought>;
  deleteThought(thoughtId: string): Promise<void>;
  reactToThought(thoughtId: string, reactionType: 'heart' | 'relate' | 'support'): Promise<Thought>;
  
  // Phase 3 Extensions
  getComments(thoughtId: string): Promise<Comment[]>;
  addComment(thoughtId: string, authorAlias: Alias, body: string): Promise<Comment>;
  toggleSaveThought(thoughtId: string): Promise<boolean>;
  reportContent(targetType: 'thought' | 'comment', targetId: string, reason: ReportReason, details?: string): Promise<void>;

  // User Blocking
  blockUser(blockerAliasId: string, blockedAliasId: string): Promise<void>;
  unblockUser(blockerAliasId: string, blockedAliasId: string): Promise<void>;
  getBlockedUserIds(blockerAliasId: string): Promise<string[]>;
}

