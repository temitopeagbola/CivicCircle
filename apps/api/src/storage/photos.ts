import { randomUUID } from 'node:crypto';

import type { Storage } from 'firebase-admin/storage';

export interface StoredPhoto {
  url: string;
  path: string;
}

export interface PhotoStorage {
  save(path: string, data: Buffer, contentType: string): Promise<StoredPhoto>;
}

/**
 * Firebase Storage via the Admin SDK. Files get a Firebase download token so the app can load
 * them with a plain URL while Storage rules stay deny-all for direct client access.
 */
export function createFirebasePhotoStorage(
  storage: Storage,
  bucketName: string,
  publicBaseUrl: string,
): PhotoStorage {
  const bucket = storage.bucket(bucketName);
  return {
    async save(path, data, contentType) {
      const token = randomUUID();
      await bucket.file(path).save(data, {
        resumable: false,
        contentType,
        metadata: {
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      const url = `${publicBaseUrl}/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
      return { url, path };
    },
  };
}

/** Test double: keeps bytes in memory and returns a fake URL. */
export function createMemoryPhotoStorage(): PhotoStorage & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    async save(path, data) {
      files.set(path, data);
      return { url: `https://photos.test/${path}`, path };
    },
  };
}
