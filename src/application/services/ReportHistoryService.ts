/**
 * ReportHistoryService.ts
 * Manages the user's submitted content reports and real-time AI moderation resolution history.
 * Multi-store persistence: localStorage + Supabase (reports & ai_report_resolutions).
 */

import { supabase } from '../../infrastructure/supabase/client';

export interface UserSubmittedReport {
  id: string;
  targetType: 'thought' | 'comment';
  targetId: string;
  contentSnippet: string;
  reportedAuthorName: string;
  reportedAuthorId?: string;
  reason: string;
  details?: string;
  createdAtISO: string;
  aiResolution: {
    decision: 'VIOLATION_CONFIRMED' | 'ESCALATED' | 'NO_VIOLATION';
    aiResponseMessage: string;
    actionTaken: string;
    strikeStatus: string;
    banStatus: string;
    confidenceScore?: number;
    policyCategory?: string;
  };
}

const STORAGE_PREFIX = 'tala_user_reports_v1';

export class ReportHistoryService {
  /**
   * Retrieves the current user's submitted reports and AI decisions.
   */
  public static async getReportsForUser(reporterAliasId: string): Promise<UserSubmittedReport[]> {
    const localList = this.getLocalReports(reporterAliasId);
    if (!reporterAliasId) return localList;

    // Sync from Supabase in background if available
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, target_type, target_id, reason, details, created_at')
        .eq('reporter_alias_id', reporterAliasId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const reportIds = data.map((row: any) => row.id);
        const { data: resRows } = await supabase
          .from('ai_report_resolutions')
          .select('*')
          .in('report_id', reportIds);

        const resMap = new Map<string, any>();
        if (resRows) {
          resRows.forEach((r: any) => resMap.set(r.report_id, r));
        }

        const remoteReports: UserSubmittedReport[] = data.map((row: any) => {
          const ai = resMap.get(row.id);
          const decision = (ai?.decision || 'ESCALATED') as 'VIOLATION_CONFIRMED' | 'ESCALATED' | 'NO_VIOLATION';
          const isConfirmed = decision === 'VIOLATION_CONFIRMED';
          const isEscalated = decision === 'ESCALATED';

          return {
            id: row.id,
            targetType: row.target_type,
            targetId: row.target_id,
            contentSnippet: localList.find((l) => l.id === row.id)?.contentSnippet || `${row.target_type} #${row.target_id.slice(0, 8)}`,
            reportedAuthorName: localList.find((l) => l.id === row.id)?.reportedAuthorName || 'Reported Author',
            reason: row.reason,
            details: row.details || '',
            createdAtISO: row.created_at,
            aiResolution: {
              decision,
              aiResponseMessage: ai?.ai_response_message || 'Under AI review.',
              actionTaken: ai?.action_taken || 'Queued for safety inspection.',
              strikeStatus: isConfirmed
                ? 'Strike 3/3 (24h Device Lock)'
                : isEscalated
                ? 'Under Review'
                : 'None',
              banStatus: isConfirmed ? 'Device Locked (24h)' : isEscalated ? 'Under Review' : 'Active (No Penalty)',
              confidenceScore: ai?.confidence_score || 0.95,
              policyCategory: ai?.policy_category || row.reason,
            },
          };
        });

        // Merge: local takes precedence for recent snippets, union by id
        const mergedMap = new Map<string, UserSubmittedReport>();
        remoteReports.forEach((r) => mergedMap.set(r.id, r));
        localList.forEach((l) => mergedMap.set(l.id, l));

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime()
        );
        this.saveLocalReports(reporterAliasId, merged);
        return merged;
      }
    } catch {
      // Graceful local-first fallback
    }

    return localList;
  }

  /**
   * Persists a new submitted report and its AI resolution.
   */
  public static async recordSubmittedReport(
    reporterAliasId: string,
    report: UserSubmittedReport
  ): Promise<void> {
    const list = this.getLocalReports(reporterAliasId);
    const updated = [report, ...list.filter((r) => r.id !== report.id)];
    this.saveLocalReports(reporterAliasId, updated);

    // Save to Supabase
    try {
      const { data: reportRow, error: reportErr } = await supabase
        .from('reports')
        .insert({
          id: report.id,
          reporter_alias_id: reporterAliasId,
          target_type: report.targetType,
          target_id: report.targetId,
          reason: report.reason,
          details: report.details || null,
          status: report.aiResolution.decision === 'VIOLATION_CONFIRMED' ? 'resolved' : 'under_review',
        })
        .select('id')
        .single();

      if (!reportErr && reportRow) {
        await supabase.from('ai_report_resolutions').insert({
          report_id: reportRow.id,
          target_type: report.targetType,
          target_id: report.targetId,
          reporter_alias_id: reporterAliasId,
          decision: report.aiResolution.decision,
          ai_response_message: report.aiResolution.aiResponseMessage,
          action_taken: report.aiResolution.actionTaken,
          confidence_score: report.aiResolution.confidenceScore || 0.95,
          policy_category: report.aiResolution.policyCategory || report.reason,
        });
      }
    } catch {
      // Best-effort remote persistence
    }
  }

  /**
   * Deletes a report record from user's history
   */
  public static async deleteReport(reporterAliasId: string, reportId: string): Promise<void> {
    const list = this.getLocalReports(reporterAliasId);
    const updated = list.filter((r) => r.id !== reportId);
    this.saveLocalReports(reporterAliasId, updated);
  }

  private static getLocalReports(reporterAliasId: string): UserSubmittedReport[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}_${reporterAliasId}`);
      if (!raw) return [];
      return JSON.parse(raw) as UserSubmittedReport[];
    } catch {
      return [];
    }
  }

  private static saveLocalReports(reporterAliasId: string, list: UserSubmittedReport[]): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}_${reporterAliasId}`, JSON.stringify(list));
    } catch {}
  }
}
