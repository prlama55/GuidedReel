# Getting started

## Choose how to run it

**Desktop app.** The quickest way is one command in a terminal, which downloads and installs the latest release for your system:

```bash
# macOS and Linux
curl -fsSL https://github.com/prlama55/GuidedReel/raw/main/scripts/install.sh | sh
```

```powershell
# Windows (PowerShell)
irm https://github.com/prlama55/GuidedReel/raw/main/scripts/install.ps1 | iex
```

Or download the installer yourself from the project's [Releases page](https://github.com/prlama55/GuidedReel/releases): a `.dmg` for macOS, an `.exe` for Windows, an `.AppImage` or `.deb` for Linux. Projects, media and rendered videos stay on your computer, rendering runs locally, and offline voices are available. Unsigned beta builds show a security warning the first time: on macOS right-click the app and choose Open, on Windows choose "More info" then "Run anyway".

**Web app.** Open the hosted address your team gave you, or run it yourself with the steps in [development.md](../development.md). Projects and media are stored in your browser, so use the same browser and profile to see them again. Rendering happens on the server and the finished MP4 downloads to your computer.

Both versions have the same editor. Anything you learn in one applies to the other.

## Your first video in ten minutes

1. **Create a project.** On the Dashboard click "New project". Give it a name, pick a format, pick a template, then "Create project".
   - 9:16 for Reels, Shorts, TikTok and Stories.
   - 16:9 for YouTube and presentations.
   - 1:1 for feed posts.
   - 4:5 for portrait feed posts.
2. **Look at the sample.** Every template opens with real sample text so the preview already plays. Press Space to watch it.
3. **Replace the words.** Click a scene in the timeline at the bottom. The inspector on the right shows its text fields. Type over the sample text and the preview updates immediately. The Script panel on the left shows all scene texts in one list if you prefer to write there.
4. **Add your media.** Open the Assets panel on the left and drop images, clips, audio or a logo onto it. Then drag an asset onto a scene card in the timeline, or pick it in the scene's Media group in the inspector. Media auto-fits the frame. If you want a different crop, Crop mode opens right after you assign it.
5. **Fix the timing.** Drag the right edge of a scene card to make it longer or shorter. Click the small chip between two cards to choose the transition into the next scene.
6. **Optional: add a voice and music.** Select a scene and click the microphone in the preview bar to record, or use "Generate voiceover" in the scene's Timing group. Click Music in the toolbar to generate a background track that matches your scenes. See [Audio](audio.md).
7. **Export.** Click Export in the toolbar, keep the Standard quality, give the file a name and press Export. On the web, click Download when it finishes. On desktop, choose where to save and then Open or Reveal in Finder / Explorer.

Everything you do is saved automatically. The badge next to the project name says Saved, Saving or Unsaved. Undo and redo cover every edit.

## Where things live

- **Dashboard**: recent projects and a quick start from each template.
- **Projects**: all projects, with search, Duplicate, Export project and Delete. "Import" opens a `project.json` exported from any copy of the app.
- **Templates**: the template gallery with the formats each one supports.
- **Assets**: every file you have uploaded, with size, dimensions and when it was added.
- **Render queue**: progress and results of every export.
- **Settings**: theme, default format and quality for new projects, voice providers and, on desktop, offline voices. The gear icon in the editor toolbar opens it too. On desktop it is also in the app menu.

## Next

- Learn the editor layout and shortcuts in [The editor](editor.md).
- See what each scene type does in [Scenes, templates and scripts](scenes.md).
