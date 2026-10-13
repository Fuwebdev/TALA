import { IThoughtRepository } from '../../domain/repositories/IThoughtRepository';

export class DeleteThoughtUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(thoughtId: string): Promise<void> {
    if (!thoughtId) {
      throw new Error('Thought ID is required.');
    }
    return this.thoughtRepo.deleteThought(thoughtId);
  }
}
