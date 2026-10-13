import { IThoughtRepository } from '../../domain/repositories/IThoughtRepository';
import { Comment } from '../../domain/entities/Comment';
import { Alias } from '../../domain/entities/Alias';

export class AddCommentUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(thoughtId: string, authorAlias: Alias, body: string): Promise<Comment> {
    if (!body || body.trim().length === 0) {
      throw new Error('Comment body cannot be empty.');
    }
    if (body.length > 300) {
      throw new Error('Comment must not exceed 300 characters.');
    }
    return this.thoughtRepo.addComment(thoughtId, authorAlias, body);
  }
}
