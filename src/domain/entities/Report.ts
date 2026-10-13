export type ReportReason =
  | 'Harassment'
  | 'Threats'
  | 'Hate or discrimination'
  | 'Sexual content'
  | 'Self-harm concern'
  | 'Spam/scam'
  | 'Personal information'
  | 'Illegal content'
  | 'Other';

export interface Report {
  id: string;
  targetType: 'thought' | 'comment';
  targetId: string;
  reason: ReportReason;
  details?: string;
  createdAtISO: string;
}
