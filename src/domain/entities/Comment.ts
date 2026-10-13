import { Alias } from './Alias';

export interface Comment {
  id: string;
  thoughtId: string;
  authorAlias: Alias;
  body: string;
  createdAtISO: string;
  status: 'published' | 'flagged' | 'removed';
}
