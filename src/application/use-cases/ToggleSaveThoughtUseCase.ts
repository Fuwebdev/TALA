import { IThoughtRepository } from '../../domain/repositories/IThoughtRepository';

export class ToggleSaveThoughtUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(thoughtId: string): Promise<boolean> {
    return this.thoughtRepo.toggleSaveThought(thoughtId);
  }
}
