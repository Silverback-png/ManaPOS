import type { WindowApi } from '@shared/types/ipc';

declare global {
  interface Window {
    /** The typed bridge exposed by the preload script. */
    api: WindowApi;
  }
}

export {};
