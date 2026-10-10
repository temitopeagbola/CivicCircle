import sharp from 'sharp';

import { HttpError } from '../errors';

export interface ProcessedPhoto {
  /** Stored and shown in the app: max 1600px, JPEG, metadata stripped. */
  full: Buffer;
  /** Sent to the vision model: max 512px to keep token cost low. */
  preview: Buffer;
  width: number;
  height: number;
}

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

/**
 * Decode, auto-rotate and re-encode an uploaded photo. Re-encoding drops EXIF (including GPS
 * and device info) and guarantees we only ever store a valid JPEG, whatever the client sent.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: 50_000_000 }).metadata()).format;
  } catch {
    format = undefined;
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new HttpError(415, 'unsupported_photo', 'Photo must be a JPEG, PNG or WebP image');
  }

  const base = () => sharp(input, { limitInputPixels: 50_000_000 }).rotate();
  const { data: full, info } = await base()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const preview = await base()
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  return { full, preview, width: info.width, height: info.height };
}
