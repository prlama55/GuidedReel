import type { DesktopApi } from '../shared/ipc';

declare global {
  interface Window {
    vc: DesktopApi;
  }
}

export {};
