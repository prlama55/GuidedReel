# Media, overlays and brand kit

## Uploading assets

Open the **Assets** panel in the editor and drop files on it, or click Upload. You can also drop files straight onto the preview or onto a scene card.

Accepted files:

- **Images**: JPEG, PNG, WebP, GIF (animated GIFs play), SVG.
- **Video**: MP4, WebM and MOV.
- **Audio**: MP3, WAV, OGG, M4A. Mark a file as voiceover or music by choosing the type in the panel.
- **Fonts**: TTF, OTF and WOFF2, for the brand kit.
- **Logos**: any image, used by the brand kit.

The limit is 500 MB per file. Duration and dimensions are read on import and shown on the card. Each card shows a real thumbnail or poster frame, how many scenes use it, and a Remove action. Removing an asset clears it from every scene that used it. The Assets page outside the editor lists everything stored across all projects.

On desktop, files stay where they are on disk and are referenced by path. On the web they are stored in the browser.

## Assigning media to a scene

- Drag an asset from the panel onto a scene card in the timeline or onto the preview.
- Or select the scene and pick the asset in the inspector's **Media** group.
- Image scenes take one image. Video scenes take one clip with a start offset. Feature and Product scenes take an illustration plus an optional background. Any scene can have background media behind its text.

## Auto fit and crop

Media is fitted automatically. When the asset's aspect ratio is close to the frame it fills the frame. When it is far off, for example a landscape photo in a 9:16 video, the whole image is shown over a blurred copy of itself so nothing is cut and there are no black bars.

The **Fit** field in the Media group lets you force **Cover** (fill, may crop) or **Contain** (show whole).

**Crop mode** opens automatically right after you assign media, and you can open it any time from the Crop button in the preview bar. Drag the image to reposition it, use the zoom slider or the plus and minus buttons, and press Reset to go back to auto. Esc or Done leaves crop mode. The crop is stored as zoom and offset, so it survives format changes.

## Overlays

Overlays are elements placed freely on top of a scene. A scene can hold up to fifty.

- **Text overlay**: "Add text" in the preview bar. Type the text in the overlay inspector, set the font size, weight, colour, alignment and an optional background pill. Long text wraps inside the box, and the box on the preview is exactly as large as the rendered text.
- **Media overlay**: "Add media" places an image, GIF, logo or clip as a floating card with rounded corners and a shadow. Choose cover or contain, corner radius, shadow and mute.
- **Sticker**: "Add sticker" opens a searchable picker of over six hundred Google Noto emoji. Animated stickers loop; turn Animated off for a static version. Speed controls the loop rate.

Working with overlays on the preview:

- Click to select, drag to move, drag the corner handle to resize. Text resizes by width and reflows; media keeps its aspect ratio.
- Overlays snap to the centre lines, the thirds and the edges. Hold Alt to disable snapping. Turn Guides on to see the lines.
- Arrow keys nudge the selected overlay. Backspace deletes it. Duplicate is in the overlay inspector.
- **Timing**: each overlay has a start offset inside the scene and either a visible duration or "visible until the scene ends".
- **Animations**: entrance (fade, slides, scale, blur, typewriter for text), exit, and a loop (pulse, float, wiggle, spin, blink). Entrance and exit lengths are adjustable.
- Lock an overlay to stop accidental drags.

The scene inspector lists all overlays of the scene; the overlay inspector has "Back to scene".

## Brand kit

The **Brand** panel defines the look of the video. Brand colours apply to the video only, never to the app itself.

- **Brand name** and **logo** (pick an uploaded image; without a logo, initials are shown where a logo would be).
- **Colours**: primary, secondary, accent, background and text. Scenes derive their palettes from these.
- **Fonts**: heading and body font from the uploaded font assets. Default fonts cover Latin, Devanagari and other scripts.
- **Watermark**: a small logo in a corner for the whole video, with opacity.
- **Call-to-action button style**: solid, outline or pill.
- "Use brand kit in this video" turns the kit on or off for the project.

## Formats

Change the format from the toolbar at any time. Text sizes scale with the frame, layouts switch between stacked and side by side, auto fit re-evaluates media, and overlay positions are stored as fractions of the frame so they stay in place.
