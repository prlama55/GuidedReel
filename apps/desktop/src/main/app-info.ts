import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Product identity used by the main process. In development Electron reports its
 * own name and version (the stock binary's Info.plist), so these come from our
 * package.json instead and are applied with app.setName / setAboutPanelOptions.
 */
export const APP_NAME = 'GuidedReel';
export const APP_COPYRIGHT = 'Copyright © 2026 Padma Raj Lama';

// out/main/index.js → apps/desktop/package.json (also inside the asar when packaged).
const pkg = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as {
  version: string;
};
export const APP_VERSION: string = pkg.version;
