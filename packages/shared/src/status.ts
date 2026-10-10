import type { ReportStatus } from './constants';

/**
 * Moderator workflow. Resolved and duplicate reports can only be reopened,
 * which keeps the history readable ("resolved → open → resolved" rather than
 * jumping between arbitrary states).
 */
const TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  open: ['acknowledged', 'in_progress', 'resolved', 'duplicate'],
  acknowledged: ['open', 'in_progress', 'resolved', 'duplicate'],
  in_progress: ['acknowledged', 'resolved', 'duplicate'],
  resolved: ['open'],
  duplicate: ['open'],
};

export function nextStatuses(from: ReportStatus): readonly ReportStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Statuses that still count as a live problem (used for duplicate detection). */
export function isActiveStatus(status: ReportStatus): boolean {
  return status !== 'resolved' && status !== 'duplicate';
}
