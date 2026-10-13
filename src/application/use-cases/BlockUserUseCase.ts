import { IThoughtRepository } from '../../domain/repositories/IThoughtRepository';

export class BlockUserUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async block(blockerAliasId: string, blockedAliasId: string): Promise<void> {
    if (!blockerAliasId || !blockedAliasId) return;
    return this.thoughtRepo.blockUser(blockerAliasId, blockedAliasId);
  }

  async unblock(blockerAliasId: string, blockedAliasId: string): Promise<void> {
    if (!blockerAliasId || !blockedAliasId) return;
    return this.thoughtRepo.unblockUser(blockerAliasId, blockedAliasId);
  }

  async getBlockedUserIds(blockerAliasId: string): Promise<string[]> {
    if (!blockerAliasId) return [];
    return this.thoughtRepo.getBlockedUserIds(blockerAliasId);
  }
}
