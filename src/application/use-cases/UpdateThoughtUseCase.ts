import { IThoughtRepository, UpdateThoughtDTO } from '../../domain/repositories/IThoughtRepository';
import { Thought } from '../../domain/entities/Thought';

export class UpdateThoughtUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(thoughtId: string, dto: UpdateThoughtDTO): Promise<Thought> {
    if (!dto.body || dto.body.trim().length === 0) {
      throw new Error('Thought body cannot be empty.');
    }
    if (dto.body.length > 500) {
      throw new Error('Thought must not exceed 500 characters.');
    }
    return this.thoughtRepo.updateThought(thoughtId, dto);
  }
}
