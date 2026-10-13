import { IThoughtRepository } from '../../domain/repositories/IThoughtRepository';
import { ReportReason } from '../../domain/entities/Report';

export class ReportContentUseCase {
  constructor(private thoughtRepo: IThoughtRepository) {}

  async execute(targetType: 'thought' | 'comment', targetId: string, reason: ReportReason, details?: string): Promise<void> {
    return this.thoughtRepo.reportContent(targetType, targetId, reason, details);
  }
}
