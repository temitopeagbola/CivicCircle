import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';

import type { Page, ReportDTO } from '@civiccircle/shared';
import {
  ACCEPTED_PHOTO_TYPES,
  LIMITS,
  createCommentSchema,
  createReportSchema,
  listReportsQuerySchema,
  nearbyQuerySchema,
  updateStatusSchema,
} from '@civiccircle/shared';

import type { AppDeps } from '../deps';
import { toCommentDTO, toMarkerDTO, toReportDTO } from '../domain/dto';
import { createReport, updateStatus } from '../domain/reports';
import { HttpError, badRequest, notFound, parseOrThrow, unauthorized } from '../errors';
import { requireModerator, requireUser } from '../middleware/auth';
import { decodeCursor, encodeCursor } from '../store/cursor';

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, 'Invalid id');
const commentPageSchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.photoMaxBytes, files: 1, fields: 10, fieldSize: 4_096 },
  fileFilter: (_req, file, cb) => {
    if ((ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(415, 'unsupported_photo', 'Photo must be a JPEG, PNG or WebP image'));
  },
});

export function reportRoutes(
  deps: AppDeps,
  limits: { reports: RequestHandler; comments: RequestHandler },
): Router {
  const { store, now } = deps;
  const router = Router();

  const loadReport = async (rawId: unknown) => {
    const id = parseOrThrow(idSchema, rawId);
    const report = await store.reports.get(id);
    if (!report) throw notFound('Report');
    return report;
  };

  router.get('/', async (req, res) => {
    const query = parseOrThrow(listReportsQuerySchema, req.query);
    if (query.mine && !req.user) throw unauthorized('Sign in to see your reports');
    const page = await store.reports.list({
      status: query.status,
      category: query.category,
      authorId: query.mine ? req.user!.id : undefined,
      sort: query.sort,
      limit: query.limit,
      cursor: decodeCursor(query.cursor),
    });
    const upvoted = req.user
      ? await store.reports.upvotedBy(
          req.user.id,
          page.items.map((r) => r.id),
        )
      : new Set<string>();
    const body: Page<ReportDTO> = {
      items: page.items.map((r) => toReportDTO(r, upvoted.has(r.id))),
      nextCursor: page.next ? encodeCursor(page.next) : null,
    };
    res.json(body);
  });

  router.get('/nearby', async (req, res) => {
    const query = parseOrThrow(nearbyQuerySchema, req.query);
    const reports = await store.reports.near(query, query.radiusKm * 1000, { limit: 300 });
    res.json({ items: reports.map(toMarkerDTO) });
  });

  router.get('/:id', async (req, res) => {
    const report = await loadReport(req.params.id);
    const upvoted = req.user ? await store.reports.upvotedBy(req.user.id, [report.id]) : new Set();
    res.json(toReportDTO(report, upvoted.has(report.id)));
  });

  router.post('/', limits.reports, upload.single('photo'), async (req, res) => {
    const user = requireUser(req);
    const input = parseOrThrow(createReportSchema, req.body);
    if (!req.file) throw badRequest('Add a photo of the issue', { photo: ['A photo is required'] });
    const report = await createReport(deps, user, input, req.file.buffer);
    res.status(201).json(toReportDTO(report, false));
  });

  router.post('/:id/upvote', async (req, res) => {
    const user = requireUser(req);
    const id = parseOrThrow(idSchema, req.params.id);
    res.json(await store.reports.toggleUpvote(id, user.id));
  });

  router.patch('/:id/status', async (req, res) => {
    const moderator = requireModerator(req);
    const id = parseOrThrow(idSchema, req.params.id);
    const input = parseOrThrow(updateStatusSchema, req.body);
    const report = await updateStatus(deps, moderator, id, input);
    const upvoted = await store.reports.upvotedBy(moderator.id, [id]);
    res.json(toReportDTO(report, upvoted.has(id)));
  });

  router.get('/:id/comments', async (req, res) => {
    const report = await loadReport(req.params.id);
    const query = parseOrThrow(commentPageSchema, req.query);
    const page = await store.comments.list(report.id, query.limit, decodeCursor(query.cursor));
    res.json({
      items: page.items.map(toCommentDTO),
      nextCursor: page.next ? encodeCursor(page.next) : null,
    });
  });

  router.post('/:id/comments', limits.comments, async (req, res) => {
    const user = requireUser(req);
    const id = parseOrThrow(idSchema, req.params.id);
    const { body } = parseOrThrow(createCommentSchema, req.body);
    const moderation = await deps.ai.moderate({ text: body });
    if (moderation.flagged) {
      throw new HttpError(422, 'content_rejected', 'Please keep comments civil and on topic.');
    }
    const comment = await store.comments.create({
      reportId: id,
      authorId: user.id,
      authorName: user.displayName,
      authorRole: user.role,
      body,
      createdAt: now(),
    });
    res.status(201).json(toCommentDTO(comment));
  });

  return router;
}
