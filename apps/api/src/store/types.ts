import type {
  AiInfo,
  Category,
  DuplicateMatch,
  GeoPoint,
  ReportStatus,
  Role,
  Severity,
  StatusChange,
} from '@civiccircle/shared';

export interface UserRecord {
  id: string;
  displayName: string;
  role: Role;
  email: string | null;
  isDemo: boolean;
  createdAt: Date;
}

export interface ReportRecord {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  description: string;
  summary: string;
  category: Category;
  severity: Severity;
  status: ReportStatus;
  photo: { url: string; path: string } | null;
  location: GeoPoint;
  geohash: string;
  address: string | null;
  ai: AiInfo;
  embedding: number[];
  embeddingModel: string;
  duplicates: DuplicateMatch[];
  duplicateOf: string | null;
  statusHistory: StatusChange[];
  upvoteCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type NewReport = Omit<ReportRecord, 'upvoteCount' | 'commentCount' | 'updatedAt'>;

export interface CommentRecord {
  id: string;
  reportId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: Date;
}

export type NewComment = Omit<CommentRecord, 'id'>;

/** Keyset pagination position. `upvoteCount` is only present for "top" sorting. */
export interface Cursor {
  createdAt: string;
  id: string;
  upvoteCount?: number;
}

export interface ListReportsOptions {
  status?: ReportStatus;
  category?: Category;
  authorId?: string;
  sort: 'new' | 'top';
  limit: number;
  cursor?: Cursor;
}

export interface NearOptions {
  /** Only return reports created at or after this time. */
  since?: Date;
  limit?: number;
}

export interface Paged<T> {
  items: T[];
  next: Cursor | null;
}

/** Applied inside a transaction: return the new record, or throw to abort. */
export type ReportMutation = (current: ReportRecord) => Partial<ReportRecord>;

export interface UserStore {
  get(id: string): Promise<UserRecord | null>;
  /** Create the user if missing; never overwrites an existing role. */
  ensure(user: Omit<UserRecord, 'createdAt'>): Promise<UserRecord>;
  update(id: string, patch: Partial<Pick<UserRecord, 'displayName' | 'role'>>): Promise<UserRecord>;
}

export interface ReportStore {
  newId(): string;
  create(report: NewReport): Promise<ReportRecord>;
  get(id: string): Promise<ReportRecord | null>;
  list(options: ListReportsOptions): Promise<Paged<ReportRecord>>;
  /** Reports within `radiusM` of `center`, nearest first. */
  near(center: GeoPoint, radiusM: number, options?: NearOptions): Promise<ReportRecord[]>;
  /** Read-modify-write in a transaction. Returns the updated record. */
  mutate(id: string, mutation: ReportMutation): Promise<ReportRecord>;
  toggleUpvote(
    reportId: string,
    userId: string,
  ): Promise<{ upvoted: boolean; upvoteCount: number }>;
  upvotedBy(userId: string, reportIds: string[]): Promise<Set<string>>;
}

export interface CommentStore {
  list(reportId: string, limit: number, after?: Cursor): Promise<Paged<CommentRecord>>;
  /** Adds the comment and bumps the report's commentCount atomically. */
  create(comment: NewComment): Promise<CommentRecord>;
}

export interface BudgetStore {
  /**
   * Atomically add `amountUsd` to the month's spend if the result stays within `capUsd`.
   * Returns false (and changes nothing) when it would exceed the cap.
   */
  tryReserve(month: string, amountUsd: number, capUsd: number): Promise<boolean>;
  /** Replace a reservation with the real cost (may be negative to refund). */
  adjust(month: string, deltaUsd: number): Promise<void>;
  get(month: string): Promise<{ spentUsd: number; calls: number }>;
}

export interface Store {
  users: UserStore;
  reports: ReportStore;
  comments: CommentStore;
  budget: BudgetStore;
}
