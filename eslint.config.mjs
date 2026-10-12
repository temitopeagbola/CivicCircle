// @ts-check
import js from '@eslint/js';
import expoConfig from 'eslint-config-expo/flat.js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const unusedVars = [
  'error',
  { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/expo-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  // Node: API, shared package, e2e tests and tooling config.
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', 'e2e/**/*.ts', '*.ts', '*.mjs'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': unusedVars,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/api/src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  // Expo app: Expo's recommended rules (React, hooks, import, TypeScript).
  ...expoConfig.map((config) => ({ ...config, files: ['apps/web/**/*.{js,jsx,ts,tsx}'] })),
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: { project: 'apps/web/tsconfig.json' },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': unusedVars,
    },
  },
);
