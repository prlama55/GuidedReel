// Starts electron-vite in development with a GuidedReel-branded Electron binary.
//
// macOS takes the bold application title in the menu bar, and the name in the About
// panel, from the running executable's Info.plist. In development that executable is
// the stock Electron.app from node_modules, so the menu bar reads "Electron" no matter
// what app.setName() says. This script copies Electron.app into .electron-dev once per
// Electron version, renames it in Info.plist, re-signs it ad hoc (the original is ad hoc
// signed too) and points electron-vite at the copy via ELECTRON_EXEC_PATH (and the `electron` package via
// ELECTRON_OVERRIDE_DIST_PATH).
// On Windows and Linux the stock binary is used unchanged.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const appDir = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(appDir, 'package.json'), 'utf8'));
const APP_NAME = 'GuidedReel';

function brandedElectronDir() {
  const electronPkgDir = path.dirname(require.resolve('electron/package.json'));
  const electronVersion = JSON.parse(
    readFileSync(path.join(electronPkgDir, 'package.json'), 'utf8'),
  ).version;
  const source = path.join(electronPkgDir, 'dist', 'Electron.app');
  const target = path.join(appDir, '.electron-dev');
  const stampFile = path.join(target, 'stamp.json');
  const stamp = JSON.stringify({ electronVersion, appName: APP_NAME, appVersion: pkg.version });
  if (existsSync(stampFile) && readFileSync(stampFile, 'utf8') === stamp) return target;

  process.stdout.write(
    `Preparing ${APP_NAME}-branded Electron ${electronVersion} for development…\n`,
  );
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  // APFS clone when available (-c): instant and takes no extra space.
  const cp = spawnSync('cp', ['-Rc', source, target], { stdio: 'ignore' });
  if (cp.status !== 0) spawnSync('cp', ['-R', source, target], { stdio: 'inherit' });

  const plist = path.join(target, 'Electron.app', 'Contents', 'Info.plist');
  const set = (key, value) => {
    // PlistBuddy's Set fails for keys Electron's plist does not define, so fall back to Add.
    const r = spawnSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plist], {
      stdio: 'ignore',
    });
    if (r.status !== 0)
      spawnSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} string ${value}`, plist], {
        stdio: 'inherit',
      });
  };
  set('CFBundleName', APP_NAME);
  set('CFBundleDisplayName', APP_NAME);
  set('CFBundleIdentifier', 'com.guidedreel.app.dev');
  set('CFBundleShortVersionString', pkg.version);
  set('NSHumanReadableCopyright', 'Copyright © 2026 Padma Raj Lama');
  // Editing Info.plist invalidates the ad hoc signature; re-sign so microphone permissions keep working.
  spawnSync('codesign', ['--force', '--deep', '--sign', '-', path.join(target, 'Electron.app')], {
    stdio: 'ignore',
  });
  writeFileSync(stampFile, stamp);
  return target;
}

const env = { ...process.env };
if (process.platform === 'darwin' && !process.env.VC_DEV_STOCK_ELECTRON) {
  try {
    const dir = brandedElectronDir();
    // `electron` (the npm package) honours ELECTRON_OVERRIDE_DIST_PATH; electron-vite spawns
    // the binary itself and reads ELECTRON_EXEC_PATH, so set both.
    env.ELECTRON_OVERRIDE_DIST_PATH = dir;
    env.ELECTRON_EXEC_PATH = path.join(dir, 'Electron.app', 'Contents', 'MacOS', 'Electron');
  } catch (err) {
    process.stderr.write(
      `Could not prepare the branded Electron binary, using the stock one: ${err}\n`,
    );
  }
}

const bin = path.join(appDir, 'node_modules', '.bin', 'electron-vite');
const child = spawn(existsSync(bin) ? bin : 'electron-vite', ['dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
  cwd: appDir,
});
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => child.kill(sig));
