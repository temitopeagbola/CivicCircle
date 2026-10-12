import { randomUUID } from 'node:crypto';

import type { CreateReportInput, UpdateStatusInput } from '@civiccircle/shared';
import { canTransition, STATUS_LABELS } from '@civiccircle/shared';
import type { Logger } from 'pino';

import type { AiService } from '../ai/service';
import { badRequest, conflict, HttpError, notFound } from '../errors';
import type { PhotoStorage } from '../storage/photos';
import type { ReportRecord, Store, UserRecord } from '../store/types';
import { DUPLICATE_RULES, findDuplicates } from './duplicates';
import { geohashFor } from './geo';
import { processPhoto } from './photo';

export interface ReportServiceDeps {
  store: Store;
  ai: AiService;
  photos: PhotoStorage;
  logger: Logger;
  now: () => Date;
}

const MAX_STATUS_HISTORY = 50;

/**
 * Create a report: normalise the photo, moderate, let AI triage it, look for nearby
 * duplicates, then persist. The photo is only uploaded once moderation has passed.
 */
export async function createReport(
  deps: ReportServiceDeps,
  author: UserRecord,
  input: CreateReportInput,
  photo: Buffer,
): Promise<ReportRecord> {
  const { store, ai, photos, logger, now } = deps;
  const processed = await processPhoto(photo);
  const previewBase64 = processed.preview.toString('base64');

  const moderation = await ai.moderate({ text: input.description, imageBase64: previewBase64 });
  if (moderation.flagged) {
    logger.info(
      { reasons: moderation.reasons, author: author.id },
      'report rejected by moderation',
    );
    throw new HttpError(
      422,
      'content_rejected',
      'This report looks like it breaks the community guidelines. Please describe the issue factually.',
    );
  }

  const location = { lat: input.lat, lng: input.lng };
  const createdAt = now();
  const [{ classification, info }, embedding, nearby] = await Promise.all([
    ai.classify({
      description: input.description,
      address: input.address,
      imageBase64: previewBase64,
    }),
    ai.embed(input.description),
    store.reports.near(location, DUPLICATE_RULES.radiusM, {
      since: new Date(createdAt.getTime() - DUPLICATE_RULES.maxAgeDays * 86_400_000),
      limit: 50,
    }),
  ]);

  const duplicates = findDuplicates(
    {
      location,
      category: classification.category,
      text: input.description,
      embedding: embedding.vector,
      embeddingModel: embedding.model,
      similarityThreshold: embedding.similarityThreshold,
    },
    nearby,
    createdAt,
  );

  const id = store.reports.newId();
  const stored = await photos.save(
    `reports/${id}/${randomUUID()}.jpg`,
    processed.full,
    'image/jpeg',
  );

  return store.reports.create({
    id,
    authorId: author.id,
    authorName: author.displayName,
    authorRole: author.role,
    description: input.description,
    summary: classification.summary,
    category: classification.category,
    severity: classification.severity,
    status: 'open',
    photo: stored,
    location,
    geohash: geohashFor(location),
    address: input.address ?? null,
    ai: info,
    embedding: embedding.vector,
    embeddingModel: embedding.model,
    duplicates,
    duplicateOf: null,
    statusHistory: [
      {
        status: 'open',
        by: { id: author.id, displayName: author.displayName },
        at: createdAt.toISOString(),
      },
    ],
    createdAt,
  });
}

export async function updateStatus(
  deps: Pick<ReportServiceDeps, 'store' | 'now'>,
  moderator: UserRecord,
  reportId: string,
  input: UpdateStatusInput,
): Promise<ReportRecord> {
  if (input.duplicateOf !== undefined && input.status !== 'duplicate') {
    throw badRequest('duplicateOf is only allowed when marking a report as duplicate');
  }
  if (input.duplicateOf) {
    if (input.duplicateOf === reportId) throw badRequest('A report cannot duplicate itself');
    const original = await deps.store.reports.get(input.duplicateOf);
    if (!original) throw notFound('Original report');
  }

  return deps.store.reports.mutate(reportId, (current) => {
    if (!canTransition(current.status, input.status)) {
      throw conflict(
        `Can't move a report from ${STATUS_LABELS[current.status]} to ${STATUS_LABELS[input.status]}`,
      );
    }
    const change = {
      status: input.status,
      ...(input.note ? { note: input.note } : {}),
      by: { id: moderator.id, displayName: moderator.displayName },
      at: deps.now().toISOString(),
    };
    return {
      status: input.status,
      duplicateOf: input.status === 'duplicate' ? (input.duplicateOf ?? null) : null,
      statusHistory: [...current.statusHistory, change].slice(-MAX_STATUS_HISTORY),
    };
  });
}
