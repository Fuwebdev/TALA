import { Alias } from './Alias';
import { Location } from './Location';

export type Category = 'Thoughts' | 'School' | 'Life' | 'Community' | 'Environment';

export interface ThoughtReactionCount {
  heart: number;
  relate: number;
  support: number;
}

export interface Thought {
  id: string;
  authorAlias: Alias;
  category: Category;
  body: string;
  location: Location;
  createdAtISO: string;
  reactions: ThoughtReactionCount;
  commentCount: number;
  isEnvironmentalAlert?: boolean;
}
