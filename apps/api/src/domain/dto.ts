import type { CommentDTO, MapMarkerDTO, MeDTO, ReportDTO } from '@civiccircle/shared';

import type { CommentRecord, ReportRecord, UserRecord } from '../store/types';

export function toReportDTO(r: ReportRecord, viewerHasUpvoted: boolean): ReportDTO {
  return {
    id: r.id,
    summary: r.summary,
    description: r.description,
    category: r.category,
    severity: r.severity,
    status: r.status,
    photoUrl: r.photo?.url ?? null,
    location: r.location,
    address: r.address,
    author: { id: r.authorId, displayName: r.authorName, role: r.authorRole },
    ai: r.ai,
    duplicates: r.duplicates,
    duplicateOf: r.duplicateOf,
    statusHistory: r.statusHistory,
    upvoteCount: r.upvoteCount,
    commentCount: r.commentCount,
    viewerHasUpvoted,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toMarkerDTO(r: ReportRecord): MapMarkerDTO {
  return {
    id: r.id,
    location: r.location,
    category: r.category,
    severity: r.severity,
    status: r.status,
    summary: r.summary,
    upvoteCount: r.upvoteCount,
  };
}

export function toCommentDTO(c: CommentRecord): CommentDTO {
  return {
    id: c.id,
    body: c.body,
    author: { id: c.authorId, displayName: c.authorName, role: c.authorRole },
    createdAt: c.createdAt.toISOString(),
  };
}

export function toMeDTO(u: UserRecord): MeDTO {
  return { id: u.id, displayName: u.displayName, role: u.role, email: u.email, isDemo: u.isDemo };
}
