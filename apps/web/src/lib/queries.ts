import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import type { Page, ReportDTO, UpdateStatusInput } from '@civiccircle/shared';

import { api, type ReportFilters } from './api';

export const keys = {
  reports: (filters: ReportFilters) => ['reports', filters] as const,
  report: (id: string) => ['report', id] as const,
  comments: (id: string) => ['comments', id] as const,
  nearby: (lat: number, lng: number, radiusKm: number) =>
    ['nearby', lat.toFixed(3), lng.toFixed(3), radiusKm] as const,
};

export function useReports(filters: ReportFilters) {
  return useInfiniteQuery({
    queryKey: keys.reports(filters),
    queryFn: ({ pageParam }) => api.listReports(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useReport(id: string) {
  return useQuery({ queryKey: keys.report(id), queryFn: () => api.report(id) });
}

export function useComments(id: string) {
  return useInfiniteQuery({
    queryKey: keys.comments(id),
    queryFn: ({ pageParam }) => api.comments(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useNearby(center: { lat: number; lng: number }, radiusKm: number) {
  return useQuery({
    queryKey: keys.nearby(center.lat, center.lng, radiusKm),
    queryFn: () => api.nearby(center.lat, center.lng, radiusKm),
    placeholderData: (previous) => previous,
  });
}

export function useAiUsage(enabled: boolean) {
  return useQuery({ queryKey: ['ai-usage'], queryFn: api.aiUsage, enabled });
}

/** Apply `update` to a report wherever it is cached: detail view and every feed page. */
function patchReportEverywhere(
  client: QueryClient,
  id: string,
  update: (report: ReportDTO) => ReportDTO,
) {
  client.setQueryData<ReportDTO>(keys.report(id), (r) => (r ? update(r) : r));
  client.setQueriesData<InfiniteData<Page<ReportDTO>>>({ queryKey: ['reports'] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((r) => (r.id === id ? update(r) : r)),
          })),
        }
      : data,
  );
}

export function useToggleUpvote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (report: ReportDTO) => api.toggleUpvote(report.id),
    // Optimistic: flip immediately, reconcile with the server's count, roll back on error.
    onMutate: async (report) => {
      await client.cancelQueries({ queryKey: keys.report(report.id) });
      patchReportEverywhere(client, report.id, (r) => ({
        ...r,
        viewerHasUpvoted: !report.viewerHasUpvoted,
        upvoteCount: report.upvoteCount + (report.viewerHasUpvoted ? -1 : 1),
      }));
      return { previous: report };
    },
    onSuccess: (result, report) =>
      patchReportEverywhere(client, report.id, (r) => ({
        ...r,
        viewerHasUpvoted: result.upvoted,
        upvoteCount: result.upvoteCount,
      })),
    onError: (_err, report, context) => {
      if (context) patchReportEverywhere(client, report.id, () => context.previous);
    },
  });
}

export function useCreateReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => api.createReport(form),
    onSuccess: (report) => {
      client.setQueryData(keys.report(report.id), report);
      void client.invalidateQueries({ queryKey: ['reports'] });
      void client.invalidateQueries({ queryKey: ['nearby'] });
      void client.invalidateQueries({ queryKey: ['ai-usage'] });
    },
  });
}

export function useAddComment(reportId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.addComment(reportId, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.comments(reportId) });
      patchReportEverywhere(client, reportId, (r) => ({ ...r, commentCount: r.commentCount + 1 }));
    },
  });
}

export function useUpdateStatus(reportId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStatusInput) => api.updateStatus(reportId, input),
    onSuccess: (report) => {
      patchReportEverywhere(client, reportId, () => report);
      void client.invalidateQueries({ queryKey: ['reports'] });
      void client.invalidateQueries({ queryKey: ['nearby'] });
    },
  });
}
