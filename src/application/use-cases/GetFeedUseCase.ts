import { IThoughtRepository, GetFeedFilter } from '../../domain/repositories/IThoughtRepository';
import { Thought } from '../../domain/entities/Thought';

export class GetFeedUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(filter?: GetFeedFilter): Promise<Thought[]> {
    return this.thoughtRepo.getFeed(filter);
  }
}
