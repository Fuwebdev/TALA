import { IThoughtRepository } from '../../domain/repositories/IThoughtRepository';
import { Thought } from '../../domain/entities/Thought';

export type CreateThoughtDTO = Omit<Thought, 'id' | 'createdAtISO' | 'reactions' | 'commentCount'>;

export class CreateThoughtUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(dto: CreateThoughtDTO): Promise<Thought> {
    if (!dto.body || dto.body.trim().length === 0) {
      throw new Error('Thought body cannot be empty.');
    }
    if (dto.body.length > 500) {
      throw new Error('Thought must not exceed 500 characters.');
    }
    return this.thoughtRepo.createThought(dto);
  }
}
