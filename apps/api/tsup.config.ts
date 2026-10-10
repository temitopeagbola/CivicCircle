import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    seed: 'src/scripts/seed.ts',
    'make-moderator': 'src/scripts/make-moderator.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  clean: true,
  // The shared package ships TypeScript source, so bundle it; everything else stays external.
  noExternal: ['@civiccircle/shared'],
});
