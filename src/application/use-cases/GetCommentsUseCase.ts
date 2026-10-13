import { IThoughtRepository } from '../../domain/repositories/IThoughtRepository';
import { Comment } from '../../domain/entities/Comment';

export class GetCommentsUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(thoughtId: string): Promise<Comment[]> {
    return this.thoughtRepo.getComments(thoughtId);
  }
}
