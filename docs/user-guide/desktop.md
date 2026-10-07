# Desktop app

The desktop app is the same editor packaged with a local video renderer. It works offline, except for cloud voice providers and animated stickers, which are fetched from the internet.

## Installing

Download from the [Releases page](https://github.com/prlama55/GuidedReel/releases):

| System  | File                  | Notes                                                                                                       |
| ------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| macOS   | `.dmg`                | Drag to Applications. Unsigned beta builds: right-click the app, choose Open, then confirm.                 |
| Windows | `.exe`                | Unsigned beta builds: SmartScreen shows "Windows protected your PC". Choose "More info", then "Run anyway". |
| Linux   | `.AppImage` or `.deb` | Make the AppImage executable (`chmod +x`) and run it, or install the `.deb` with your package manager.      |

## Menus

- **App menu (macOS) or File (Windows and Linux)**: Settings (Cmd , or Ctrl ,).
- **File**: New Project, Projects, Save, Import Project, Export Project, Export Video.
- **Edit**: Undo, Redo, Cut, Copy, Paste, Delete, Select All.
- **View**: reload, zoom, full screen, developer tools.
- **Help**: Keyboard Shortcuts, Open Logs Folder.

Shortcuts use Cmd on macOS and Ctrl elsewhere.

## Where your files are

- **Projects** are saved in the app's data folder and listed on the Projects page. Export Project writes a portable `project.json` you can back up, send to someone or open in the web app with Import.
- **Assets** stay where you dropped them from. Dragging files from Finder or Explorer onto the editor imports them by reference. If you move or delete the original file, the scene shows a missing media warning until you reassign it.
- **Rendered videos** go wherever you chose in the save dialog.
- **Offline voices** are downloaded into the app's data folder under `tts`.
- **Logs** are available from Help → Open Logs Folder. Attach them when reporting a problem.

Application data folder by system:

```text
macOS    ~/Library/Application Support/GuidedReel
Windows  %APPDATA%\GuidedReel
Linux    ~/.config/GuidedReel
```

## Offline voices

Settings → Local voices lists the available Piper voices with language and size. Click Install next to a voice; the engine downloads once, then each voice separately. Installed voices appear under the Local provider in the voiceover dialog. Everything runs on your computer and no account or key is needed.

## Project import and export

- **Export Project** saves `project.json`. It contains scenes, text, settings and references to assets, not the media files themselves. Keep the media alongside when moving between machines, or re-link assets after import.
- **Import Project** opens a `project.json` created by any version of the app. Older files are upgraded automatically.
- On the Projects page each project also has Duplicate and Delete.

## Closing with unsaved changes

Autosave runs continuously. If you close the window while a save is still in progress, the app asks before quitting.
