import type { Category, ReportStatus, Role, Severity } from './constants';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AuthorDTO {
  id: string;
  displayName: string;
  role: Role;
}

export type AiProviderName = 'openai' | 'mock';

export interface AiInfo {
  /** Provider that produced category/severity/summary. */
  provider: AiProviderName;
  model: string;
  confidence: number;
  /** Set when OpenAI was configured but we fell back (budget cap, timeout, error). */
  fallbackReason?: string;
}

export interface DuplicateMatch {
  id: string;
  summary: string;
  status: ReportStatus;
  /** 0–1 combined score of text similarity, distance and category. */
  score: number;
  distanceM: number;
  createdAt: string;
}

export interface StatusChange {
  status: ReportStatus;
  note?: string;
  by: { id: string; displayName: string };
  at: string;
}

export interface ReportDTO {
  id: string;
  summary: string;
  description: string;
  category: Category;
  severity: Severity;
  status: ReportStatus;
  photoUrl: string | null;
  location: GeoPoint;
  address: string | null;
  author: AuthorDTO;
  ai: AiInfo;
  /** Possible duplicates flagged by AI at creation time. */
  duplicates: DuplicateMatch[];
  /** Set when a moderator confirms this report duplicates another. */
  duplicateOf: string | null;
  statusHistory: StatusChange[];
  upvoteCount: number;
  commentCount: number;
  viewerHasUpvoted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MapMarkerDTO {
  id: string;
  location: GeoPoint;
  category: Category;
  severity: Severity;
  status: ReportStatus;
  summary: string;
  upvoteCount: number;
}

export interface CommentDTO {
  id: string;
  body: string;
  author: AuthorDTO;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface MeDTO {
  id: string;
  displayName: string;
  role: Role;
  email: string | null;
  isDemo: boolean;
}

export interface UpvoteResultDTO {
  upvoted: boolean;
  upvoteCount: number;
}

export interface HealthDTO {
  ok: true;
  version: string;
  aiProvider: AiProviderName;
  uptimeSeconds: number;
}

export interface AiUsageDTO {
  month: string;
  spentUsd: number;
  budgetUsd: number;
  calls: number;
  provider: AiProviderName;
  model: string;
}

export interface DemoLoginDTO {
  customToken: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
