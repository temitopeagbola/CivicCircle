import { z } from 'zod';

import { CATEGORIES, LIMITS, SEVERITIES, STATUSES } from './constants';

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

/** Text fields of a new report. Sent as multipart form fields alongside the photo. */
export const createReportSchema = z.object({
  description: z
    .string()
    .trim()
    .min(
      LIMITS.descriptionMin,
      `Describe the issue in at least ${LIMITS.descriptionMin} characters`,
    )
    .max(LIMITS.descriptionMax),
  lat: latitude,
  lng: longitude,
  address: z
    .string()
    .trim()
    .max(LIMITS.addressMax)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const listReportsQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  sort: z.enum(['new', 'top']).default('new'),
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(20),
});
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export const nearbyQuerySchema = z.object({
  lat: latitude,
  lng: longitude,
  radiusKm: z.coerce.number().min(0.1).max(LIMITS.nearbyRadiusKmMax).default(3),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(LIMITS.commentMax),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  note: z
    .string()
    .trim()
    .max(LIMITS.statusNoteMax)
    .optional()
    .transform((v) => (v ? v : undefined)),
  duplicateOf: z.string().min(1).max(128).optional(),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const demoLoginSchema = z.object({
  as: z.enum(['resident', 'moderator']).default('resident'),
});
export type DemoLoginInput = z.infer<typeof demoLoginSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(LIMITS.displayNameMax),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Shape the AI provider must return; also used to validate OpenAI's JSON output. */
export const aiClassificationSchema = z.object({
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  summary: z.string().trim().min(3).max(120),
  confidence: z.number().min(0).max(1),
});
export type AiClassification = z.infer<typeof aiClassificationSchema>;
