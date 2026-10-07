# UI / UX

The shared UI lives in `packages/ui` and is plain React: no Next.js or Electron imports (lint-enforced). Hosts inject an `EditorHost` (storage, asset resolver, render client, platform adapter, templates, navigation).

## Editor layout

```text
Toolbar: back · name · save state · undo/redo · duration · format · Music · problems · Settings · shortcuts · Export
Rail (Scenes, Script, Assets, Templates, Brand) | Left panel | Preview stage | Inspector (right)
```

The inspector has a **Scene / Project** switch at the top. A scene is selected almost all the time, so project-wide settings (music, frame rate, default transition, voiceovers for all scenes) are one click away without deselecting; switching back restores the last selected scene. The toolbar also has a **Music** button that opens the music generator directly and a **Settings** gear that leaves the editor for Settings (theme, defaults, voice providers).

```text
Timeline (bottom): scene cards sized by duration, transition chips, playhead, ruler
```

Panels are resizable (react-resizable-panels) and the left/inspector panels collapse. Selecting a scene anywhere selects it everywhere and seeks the player to it. The inspector shows the selected scene or, with nothing selected, project settings.

## Key behaviours

- **Scene-first, script-driven**: the Script panel is one text block per scene; paste text/JSON/CSV to create scenes. Reorder by dragging cards; drag a card's right edge to change duration (snaps to the scene minimum).
- **Schema-driven inspector**: fields come from each scene type's inspector metadata, grouped as Content, Media, Timing, Transition, Style.
- **Preview**: Remotion Player with custom controls: previous/next scene, previous/next frame, a single Play/Stop button (Stop pauses at the current frame), a timecode you can click and type into (mm:ss.ff or seconds), seek bar, playback speed (0.25×–2×), loop, play-selected-scene-only, volume slider with mute, a guides toggle (centre lines and thirds; overlays snap to them, hold ⌥ to skip snapping), fullscreen and a 9:16 safe-zone overlay for Reels/Shorts/TikTok UI. J/K/L shuttle keys slow down, pause and speed up playback.
- **Timeline**: Split cuts the scene under the playhead into two identical scenes with a hard cut (S); Zoom to fit shows the whole video; Alt+←/→ moves the selected scene earlier or later.
- **Crop mode**: for scenes with media (Image, Video, Feature, Product) a Crop toggle overlays the preview: drag to reposition, scroll or the ± buttons to zoom (1×–4×), double-click or Reset to clear. Framing is stored on the scene as `mediaZoom`, `mediaOffsetX`, `mediaOffsetY` and is also editable as sliders in the inspector's Media group. A drag or zoom burst is a single undo step. Crop mode opens automatically when primary media is uploaded or assigned to a scene, and the inspector's media field has a Crop button to reopen it.
- **Assets**: drag-and-drop or upload; thumbnails, type filter, usage counts, click to assign to the selected scene; missing assets are flagged.
- **Export**: quality presets, codec, estimated size; staged progress (queued → preparing → rendering → encoding → done) with cancel; download (web) or open / reveal in folder (desktop).
- **Overlays**: the preview bar's T, image and smiley buttons add a text, media or sticker overlay to the selected scene. The sticker picker searches ~600 free Noto emoji by name and category with an Animated toggle; Add media accepts .gif files, which play in the preview and the export. Overlays are edited directly on the preview: click to select, drag to move, drag the corner to resize (media keeps its aspect ratio), arrow keys nudge (Shift for larger steps), Delete removes, ⌘/Ctrl+D duplicates. The inspector shows text/media properties, position, size, rotation, opacity, z-order, timing within the scene, and animation (entrance, entrance length, exit, exit length and a continuous loop); overlays can be locked. Every scene's Style group also offers a whole-scene Entrance and Exit, Image scenes a Motion preset, and transitions include wipe directions, flip, clock wipe and iris.
- **Audio**: Record voiceover (preview bar mic button or the scene's Timing group) opens a recorder with microphone choice, live level meter and an option to play the scene silently while you speak; takes are trimmed, normalised, saved as WAV voiceover assets and attached so the scene can follow their length. The project inspector's Music group has "Generate music from scenes": a mood (suggested from the template), an Energy of Soft / Medium / Hard (background bed, balanced, or driving with full drums; it scales the intensity curve and nudges the tempo), tempo from scene pacing, an intensity curve that peaks on the call to action, a deterministic seed with "Variation", preview, a Mix choice (Background 15% ducked, Balanced 30% ducked, Foreground 60% no ducking) applied on use, and "Align scene cuts to the beat". For uploaded tracks, "Detect tempo" estimates the BPM and "Align scene cuts" snaps scene lengths to it.
- **Generated voiceover**: "Generate voiceover" in a scene's Timing group (or "Generate voiceovers for all scenes" in the project inspector) speaks the scene script with a text-to-speech provider. On desktop the default is **Local (Piper voices, offline)**: free, runs on the computer, voices installed on demand from Settings → Local voices (Nepali, Hindi, English and more). Cloud providers (OpenAI, ElevenLabs, Google Cloud TTS) work on web and desktop with the user's own API key entered in Settings → Voice providers; keys stay on the device (browser storage on web, OS-encrypted on desktop) and go straight to the provider. The result is a normal voiceover asset, so scene length can follow it and music ducks under it.
- **Fundamentals**: undo/redo (zundo), autosave with Saved / Saving / Unsaved status, keyboard shortcuts (`?` shows them), Problems panel, empty states, skeleton loaders, toasts with actions, confirmation for destructive actions.
- **Theme**: dark by default, light and system via Settings; tokens are CSS variables consumed by Tailwind v4 (`@theme inline`). Brand kit colours apply to the video, never to the app UI.
- **Fonts**: scene text uses a wide-coverage fallback stack (Latin, Devanagari, CJK); brand fonts are uploaded as assets and loaded before render.

## Platform adapter

`PlatformAdapter` abstracts file picking, saving, opening links, revealing files and the document-edited flag. Web uses `<input type=file>` and anchor downloads; desktop uses native dialogs via IPC.
