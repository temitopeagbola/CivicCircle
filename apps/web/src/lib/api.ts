import type {
  AiUsageDTO,
  ApiErrorBody,
  Category,
  CommentDTO,
  DemoLoginDTO,
  HealthDTO,
  MapMarkerDTO,
  MeDTO,
  Page,
  ReportDTO,
  ReportStatus,
  UpdateStatusInput,
  UpvoteResultDTO,
} from '@civiccircle/shared';

import { apiStatus } from './apiStatus';
import { config } from './config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let tokenGetter: () => Promise<string | null> = async () => null;

/** Registered by the auth provider so every request carries a fresh Firebase ID token. */
export function setTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

type Query = Record<string, string | number | boolean | undefined>;

/** Generous timeout: a cold start on Render's free tier can take up to a minute. */
const TIMEOUT_MS = 90_000;

async function request<T>(
  path: string,
  init: { method?: string; query?: Query; json?: unknown; form?: FormData } = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const url = `${config.apiUrl}${path}${params.size ? `?${params}` : ''}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }

  const handle = apiStatus.start();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    apiStatus.end(handle, false);
    throw new ApiError(
      0,
      'network',
      'Could not reach the CivicCircle server. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
  apiStatus.end(handle, response.status < 500);

  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? `Request failed (${response.status})`,
      error?.details,
    );
  }
  return data as T;
}

export interface ReportFilters {
  status?: ReportStatus;
  category?: Category;
  sort?: 'new' | 'top';
  mine?: boolean;
}

export const api = {
  health: () => request<HealthDTO>('/health'),
  demoLogin: (as: 'resident' | 'moderator') =>
    request<DemoLoginDTO>('/v1/auth/demo', { method: 'POST', json: { as } }),
  me: () => request<MeDTO>('/v1/me'),
  updateMe: (displayName: string) =>
    request<MeDTO>('/v1/me', { method: 'PATCH', json: { displayName } }),
  listReports: (filters: ReportFilters, cursor?: string, limit = 20) =>
    request<Page<ReportDTO>>('/v1/reports', {
      query: { ...filters, mine: filters.mine || undefined, cursor, limit },
    }),
  nearby: (lat: number, lng: number, radiusKm: number) =>
    request<{ items: MapMarkerDTO[] }>('/v1/reports/nearby', { query: { lat, lng, radiusKm } }),
  report: (id: string) => request<ReportDTO>(`/v1/reports/${encodeURIComponent(id)}`),
  createReport: (form: FormData) => request<ReportDTO>('/v1/reports', { method: 'POST', form }),
  toggleUpvote: (id: string) =>
    request<UpvoteResultDTO>(`/v1/reports/${encodeURIComponent(id)}/upvote`, { method: 'POST' }),
  updateStatus: (id: string, input: UpdateStatusInput) =>
    request<ReportDTO>(`/v1/reports/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      json: input,
    }),
  comments: (id: string, cursor?: string) =>
    request<Page<CommentDTO>>(`/v1/reports/${encodeURIComponent(id)}/comments`, {
      query: { cursor, limit: 50 },
    }),
  addComment: (id: string, body: string) =>
    request<CommentDTO>(`/v1/reports/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      json: { body },
    }),
  aiUsage: () => request<AiUsageDTO>('/v1/admin/ai-usage'),
};

/** A message safe to show users for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
