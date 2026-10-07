# Desktop app

`apps/desktop` is an Electron 44 shell built with electron-vite. It renders the same `@guidedreel/ui` editor as the web app.

```text
Main process         storage (projects as JSON, assets dir), vc-asset:// protocol, IPC, menu, render manager
Preload              contextBridge → window.vc (typed, validated channels only)
Renderer             React app with hash routing; desktop host adapters for storage, render, platform
render-worker        utilityProcess running LocalRemotionRenderer per job
```

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- The preload exposes only `window.vc`; no `ipcRenderer`, `fs` or `shell` reach the page.
- Every IPC channel is listed in `src/shared/ipc.ts` with a Zod schema; main validates arguments before acting. Unknown channels do not exist.
- Local media is served through `vc-asset://`:
  - `vc-asset://store/<key>` → files in the app's asset store.
  - `vc-asset://local/<path>` → only paths the user picked in a dialog, dropped from the OS, or referenced by an opened project (allowlist). No arbitrary file reads.
- `file://` is never used for media; `webSecurity` stays on. A strict CSP is set on all responses. It allows `https:` images/media/connections (Noto stickers, remote assets), `data:` media (the Player's silent unlock clip) and `worker-src 'self' blob:` (the GIF decoder runs in a blob Web Worker). Changing the CSP must keep the desktop e2e tests green.
- External links open in the system browser; `will-navigate` is blocked.
- Only the `media` permission (microphone, for recording) is granted to the renderer; `NSMicrophoneUsageDescription` and the `audio-input` entitlement are set for macOS.

## Title bar and drag regions

macOS uses `titleBarStyle: 'hiddenInset'`. The app's own toolbars (`[data-vc-titlebar]` in the shared UI) are the drag region and every interactive child opts out with `-webkit-app-region: no-drag`. Never add a full-width drag overlay above the toolbar: it swallows clicks on Back, Undo/Redo and Export.

## End-to-end test

`pnpm --filter @guidedreel/desktop build && pnpm --filter @guidedreel/desktop test:e2e` drives the built app with Playwright: create a project, open Export, render, and assert the MP4 exists. Two environment hooks exist only for automation: `VC_E2E_OUTPUT_DIR` skips the native save dialog and `VC_E2E_USER_DATA` isolates user data.

## Closing with unsaved changes

The web editor uses `beforeunload`; in Electron that would block the window from closing silently, so the desktop skips it and instead the main process asks natively (“Close anyway / Cancel”) when `setDocumentEdited` is on, i.e. during the sub-second autosave window.

## Data locations

| What                         | Where                                                          |
| ---------------------------- | -------------------------------------------------------------- |
| Projects                     | `userData/projects/<id>.json`                                  |
| Assets                       | `userData/assets/<key>` + `index.json`                         |
| Logs                         | `userData/logs/main.log` (JSON lines; Help → Open Logs Folder) |
| Local speech engine + voices | `userData/tts/engine`, `userData/tts/voices/<voice>`           |
| Provider API keys            | `userData/secrets.json` (encrypted with `safeStorage`)         |
| Dev Remotion bundle cache    | `userData/remotion-bundle`                                     |
| Exports                      | user-chosen path (defaults to the Videos folder)               |

## Menu

App menu (macOS) or File (Windows/Linux): Settings… (⌘, / Ctrl+,). File: New Project, Projects, Save, Import Project, Export Project, Export Video. Edit: Undo/Redo/clipboard. View, Window, Help (Keyboard Shortcuts, Open Logs Folder). Shortcuts use ⌘ on macOS and Ctrl elsewhere.

## Local voices

Settings → Local voices downloads the sherpa-onnx engine (about 20–45 MB, Apache-2.0) and Piper voice archives (20–75 MB each) into `userData/tts`. Synthesis runs `sherpa-onnx-offline-tts` as a child process, so nothing leaves the machine and no account is needed. The upstream Piper macOS binary is not used because its release omits the required libraries. `apps/desktop/e2e/tts-local.spec.ts` installs a voice and generates a voiceover end to end. It is skipped unless `VC_E2E_TTS=1` (or `VC_E2E_TTS_USER_DATA=<dir>`, which also reuses downloads between runs) because it fetches about 100 MB.

## Build and package

```bash
pnpm --filter @guidedreel/desktop build       # electron-vite build + prebuilt Remotion bundle → resources/remotion-bundle
pnpm --filter @guidedreel/desktop dist:dir    # unpacked app in apps/desktop/release (fast packaging check)
pnpm --filter @guidedreel/desktop dist:mac    # .dmg (arm64 + x64)
pnpm --filter @guidedreel/desktop dist:win    # NSIS .exe
pnpm --filter @guidedreel/desktop dist:linux  # .AppImage and .deb
```

`electron-builder.yml` unpacks `@remotion/**` from the asar archive and ships the bundle as an extra resource. Signing and notarization are driven by environment variables (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`) and are off locally. Auto-update can be added with `electron-updater` once a publish target is configured (`publish` in the builder config).

## Installer scripts and release files

`scripts/install.sh` (macOS, Linux; POSIX `sh`) and `scripts/install.ps1` (Windows) let people without developer tools install the app with one command (see the README). They query the GitHub Releases API for the latest release (or `--version <tag>`), pick the asset for the current OS and CPU, download it and install it: `.dmg` is mounted and the app copied to `/Applications` (or `~/Applications`) with the quarantine flag cleared because builds are not notarized yet; the AppImage goes to `~/.local/bin` with a `.desktop` entry and icon; `--deb` uses `apt-get`; the Windows `.exe` runs the NSIS wizard, or `/S` with `-Silent`.

`electron-builder.yml` sets `artifactName: ${productName}-${version}-${os}-${arch}.${ext}` so the file names are predictable (`GuidedReel-0.1.0-mac-arm64.dmg`, `GuidedReel-0.1.0-win-x64.exe`, `GuidedReel-0.1.0-linux-x86_64.AppImage`, `guidedreel-0.1.0-linux-amd64.deb`). The scripts match loosely on `arm64|aarch64` and `x64|x86_64|amd64`, so older names still work.

The scripts read `/releases/latest`, which ignores drafts and pre-releases: after the release workflow finishes, publish the draft release on GitHub and the scripts pick it up. The repository URL is a single constant (`REPO_URL` / `$RepoUrl`), so forks created with `create-guidedreel` get their own URL.

Test locally without a release by pointing a script at a file: `sh scripts/install.sh --file apps/desktop/release/GuidedReel-0.1.0-mac-arm64.dmg --dir /tmp/Applications --no-open`, or `.\scripts\install.ps1 -File .\GuidedReel-0.1.0-win-x64.exe`.

## Development app name on macOS

`pnpm dev:desktop` runs `apps/desktop/scripts/dev.mjs`. On macOS it clones `node_modules/electron/dist/Electron.app` into `apps/desktop/.electron-dev` (an APFS clone, so it takes no extra space), sets `CFBundleName`, `CFBundleDisplayName`, bundle identifier, version and copyright in its `Info.plist`, re-signs it ad hoc and starts electron-vite with `ELECTRON_EXEC_PATH` (and `ELECTRON_OVERRIDE_DIST_PATH` for the `electron` package) pointing at the copy. Without this, the bold application title in the menu bar and the About panel read "Electron" in development, because macOS takes them from the running executable's bundle rather than from `app.setName()`. The copy is refreshed whenever the Electron or app version changes. Set `VC_DEV_STOCK_ELECTRON=1` to skip it. Windows and Linux use the stock binary. Packaged builds are unaffected; electron-builder writes the real `Info.plist`.
