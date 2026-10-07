# The editor

The editor needs a window at least 1280 pixels wide. On smaller screens it asks you to open it on a larger one.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Project name · Saved │ Undo Redo │ 00:14 │ Format ▾ │ Music │ ⚠ │ ⚙ │ ? │ Export │
├────┬──────────────┬──────────────────────────────────┬──────────────────────┤
│Rail│ Left panel   │           Preview stage          │ Inspector            │
│    │              │                                  │ [Scene] [Project]    │
│ ▣  │ Scenes       │                                  │                      │
│ ✎  │ Script       │                                  │ Content              │
│ ▤  │ Assets       │                                  │ Media                │
│ ◫  │ Templates    │                                  │ Timing               │
│ ◆  │ Brand        │  ⏮ ◀ ▶ ▶ ⏭  00:04.12 / 00:14  … │ Transition / Style   │
├────┴──────────────┴──────────────────────────────────┴──────────────────────┤
│ Timeline: [Hook 2.5s] ⇄ [Intro 3s] ⇄ [Feature 4s] ⇄ [CTA 3s]   +            │
└───────────────────────────────────────────────────────────────────────────┘
```

Drag the dividers to resize panels. Panels collapse when dragged closed.

## Toolbar

- **Back arrow**: return to Projects. Your work is already saved.
- **Project name**: click to rename.
- **Save badge**: Saved, Saving, Unsaved or Save failed.
- **Undo / Redo**: every project edit, including drags on the timeline and on overlays.
- **Duration**: total length of the video.
- **Format**: switch between 9:16, 16:9, 1:1 and 4:5 at any time. Scenes adapt their layout. Media that no longer fits is handled by auto fit.
- **Music**: open the background music generator.
- **Problems**: a list of issues such as missing media or text that overflows, each linking to the scene. Red means the export will be blocked or wrong, amber is a warning.
- **Settings gear**: theme, defaults and voice providers.
- **?**: the keyboard shortcut list.
- **Export**: render the video.

## Left rail and panels

- **Scenes**: the ordered list of scenes with type icons and durations. Drag to reorder. The "+" adds a scene of a chosen type.
- **Script**: one text block per scene. Edit text here, add blocks to add scenes, and use Import to paste a plain script, JSON or CSV. See [Scenes, templates and scripts](scenes.md).
- **Assets**: upload and manage media for this project, filter by type, drag an asset onto a scene. See [Media](media.md).
- **Templates**: swap the whole scene list for another template. It asks before replacing scenes.
- **Brand**: colours, fonts, logo, watermark and call-to-action button style. See [Brand kit](media.md#brand-kit).

## Preview stage

The preview is a live player. It never renders a file while you edit, so changes show up instantly.

Controls in the bar under the picture:

- **Previous / next scene**, **previous / next frame**, and one **Play / Stop** button. Stop pauses where you are; it does not jump back to the start.
- **Timecode**: click it to type a time such as `0:12.5` or `12.5`.
- **Speed**: play at a fraction or multiple of normal speed. J slows down, K pauses, L speeds up.
- **Loop** the whole video, or **loop the selected scene** while you fine-tune it.
- **Add text**, **add media**, **record voiceover** and **add sticker** put new elements on the selected scene.
- **Crop**: zoom and pan the scene's media inside the frame. See [Auto fit and crop](media.md#auto-fit-and-crop).
- **Guides**: centre lines and thirds. Overlays snap to them while dragging.
- **Safe zones**: in 9:16, shows where Reels, Shorts and TikTok draw their own buttons and captions so your text stays visible.
- **Volume** for the preview only. It does not change the exported mix.

Click an overlay on the preview to select it, drag to move it, and drag the corner handle to resize. Hold Alt while dragging to turn off snapping.

## Timeline

Scene cards are as wide as the scene is long. Transitions overlap the two scenes they join, so the total duration is a little shorter than the sum of the scenes.

- **Click** a card to select the scene and jump to it. The selection is shared with the Scenes panel, the Script panel and the inspector.
- **Drag** a card to reorder. Alt plus left or right arrow moves the selected scene one step.
- **Drag the right edge** to change the duration. It snaps to half seconds and shows the new length.
- **Transition chips** sit between cards. Click one to choose the transition type and its length.
- **Playhead**: click or drag the ruler to seek. "Split scene at playhead" (or press S) cuts the current scene in two, with text and media copied to both halves.
- **Insert**: hover between two cards for an insert button, or use "+" at the end.
- **Zoom**: zoom in, zoom out, or fit the whole video.
- **Badges** on a card show errors (red) or warnings (amber) for that scene.

## Inspector

The inspector always shows the current selection and has a **Scene / Project** switch at the top.

**Scene** shows the selected scene's groups, generated from the scene type:

- **Content**: the text fields, size and alignment.
- **Media**: the image or clip, fit mode, zoom and position, background media or colour, brand logo toggle.
- **Timing**: duration, "follow the voiceover" mode, voiceover recording and generation.
- **Transition**: the transition into this scene and its length.
- **Style**: enter and exit animation for the whole scene, colours.

Below the groups is the **Overlays** list for the scene, with every text, media and sticker overlay. Click one to edit it; "Back to scene" returns here. The header has Duplicate scene, change scene type and Delete.

**Project** shows settings for the whole video: frame rate, background colour, default transition, music, music and voiceover volume, ducking, and "Generate voiceovers for all scenes".

**Overlay** appears when an overlay is selected: text, font size, weight, colour, background pill, alignment, position, width, rotation, opacity, start offset and visible duration, and the entrance, exit and loop animations. Media overlays add fit, corner radius, shadow and mute. Stickers add Animated and speed.

## Keyboard shortcuts

Use Cmd on macOS and Ctrl on Windows and Linux.

| Action                            | Keys                |
| --------------------------------- | ------------------- |
| Play / stop                       | Space               |
| Shuttle slower / pause / faster   | J / K / L           |
| Step one frame                    | ← / →               |
| Step one second                   | Shift + ← / →       |
| Go to start / end                 | Home / End          |
| Split scene at playhead           | S                   |
| Move scene earlier / later        | Alt + ← / →         |
| Skip snapping while dragging      | hold Alt            |
| Nudge selected overlay            | arrow keys          |
| Undo / Redo                       | Cmd Z / Shift Cmd Z |
| Duplicate scene                   | Cmd D               |
| Delete scene or overlay           | Backspace / Delete  |
| Save now                          | Cmd S               |
| Export                            | Cmd E               |
| Deselect, close dialog, exit crop | Esc                 |
| Show this list                    | ?                   |
