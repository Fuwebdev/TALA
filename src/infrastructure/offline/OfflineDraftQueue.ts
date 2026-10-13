import { Thought } from '../../domain/entities/Thought';

const DRAFTS_KEY = 'tala_offline_drafts_v1';

export class OfflineDraftQueue {
  public static saveDraft(draft: Omit<Thought, 'id' | 'createdAtISO' | 'reactions' | 'commentCount'>): void {
    const existing = this.getDrafts();
    existing.push({
      ...draft,
      savedAtISO: new Date().toISOString(),
    });
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(existing));
  }

  public static getDrafts(): any[] {
    try {
      const data = localStorage.getItem(DRAFTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static clearDrafts(): void {
    localStorage.removeItem(DRAFTS_KEY);
  }
}
