import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { makeImage } from '../test/helpers';
import { processPhoto } from './photo';

describe('processPhoto', () => {
  it('re-encodes to JPEG, strips metadata and downsizes', async () => {
    const withExif = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: '#888' },
    })
      .withMetadata({ exif: { IFD0: { Make: 'TestPhone', Model: 'X1' } } })
      .png()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const { full, preview, width, height } = await processPhoto(withExif);
    const fullMeta = await sharp(full).metadata();
    expect(fullMeta.format).toBe('jpeg');
    expect(fullMeta.exif).toBeUndefined();
    expect([width, height]).toEqual([1600, 800]);
    expect((await sharp(preview).metadata()).width).toBe(512);
  });

  it('does not upscale small images', async () => {
    const { width } = await processPhoto(await makeImage('jpeg', { width: 300, height: 200 }));
    expect(width).toBe(300);
  });

  it('rejects files that are not images', async () => {
    await expect(processPhoto(Buffer.from('<svg onload=alert(1)>'))).rejects.toMatchObject({
      status: 415,
      code: 'unsupported_photo',
    });
  });
});
