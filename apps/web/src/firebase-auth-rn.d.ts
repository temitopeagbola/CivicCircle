// Firebase ships `getReactNativePersistence` only in the React Native build of @firebase/auth,
// but its package.json lists the generic typings first, so TypeScript never sees it.
// This file is a module (see the export below), so the block augments rather than replaces.
import type { Persistence } from 'firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}

export {};
