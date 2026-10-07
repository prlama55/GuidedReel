# Scenes, templates and scripts

## Scene types

Each scene type has its own layout and its own fields. All of them adapt to every format and use the brand kit colours and fonts.

| Type               | Use it for                                             | Main fields                                         |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------- |
| **Hook**           | The first two seconds. Big text that stops the scroll. | Text, highlighted words, animation, size            |
| **Intro**          | Title card with subtitle and optional logo             | Title, subtitle, show logo                          |
| **Text**           | A statement or a list point                            | Text, size, alignment, background                   |
| **Image**          | Full-frame photo with caption and motion               | Image, caption, motion (Ken Burns, zoom, pan), fit  |
| **Video**          | A clip, trimmed, with optional caption                 | Video, start offset, mute, caption, fit             |
| **Feature**        | One benefit with an illustration                       | Title, description, badge, media, layout            |
| **Product**        | Product shot with name, price and bullets              | Name, tagline, price, image, bullets                |
| **Quote**          | Testimonial or quotation with author and stars         | Quote, author, role, rating                         |
| **Call to action** | What to do next, with a button and link                | Headline, subline, button text, URL or handle, logo |
| **Outro**          | Closing card with handles                              | Text, handles, show logo                            |

Every scene also has a background (colour or media), enter and exit animation, and a transition into it. Durations have a sensible default per type and a minimum that keeps text readable.

To change a scene's type, use the type selector in the inspector header. Fields with the same name carry over.

## Templates

A template is a complete scene sequence with sample content. It is a starting point, not a lock: after creating the project you can add, remove, reorder and retype scenes freely.

| Template                  | Formats              | Structure                                                               |
| ------------------------- | -------------------- | ----------------------------------------------------------------------- |
| **Modern Promotional**    | 9:16, 16:9, 1:1, 4:5 | Hook, intro, up to four features, optional quote, call to action, outro |
| **Product Advertisement** | 9:16, 16:9, 1:1, 4:5 | Hook, product, features, optional testimonial, call to action           |
| **Social Reel**           | 9:16, 1:1, 4:5       | Hook, a text scene per point, call to action with handle                |
| **Blank**                 | all                  | No scenes. Build from the Script panel or the "+" button.               |

Switching template later: open the Templates panel in the editor and pick another one. The editor asks before replacing your scenes.

## Writing the script

The **Script panel** shows one text block per scene, in order. Editing a block edits the scene. Each block has a type badge; click it to change the scene type. The list reorders by drag, the same as the timeline.

### Import a plain script

Click Import in the Script panel and paste text. Each paragraph (separated by a blank line) becomes one scene. The first paragraph becomes a Hook, the last one a Call to action when there are at least three paragraphs, and the rest become Text scenes. Durations are estimated from the word count. You can change any type or length afterwards.

```text
Too much news, no time to read?

Meet Ajako Taja.

Trending stories, summarised in seconds.

Download today.
```

### Import JSON

Paste or upload either a bare array of scenes or a whole project draft (`name`, `format`, `templateId`, `brand`, `scenes`). Each scene has a `type`, optional `title`, `durationSeconds` and `transitionIn`, and a `props` object with that type's fields. Problems are listed with their path before anything is created.

```json
[
  {
    "type": "hook",
    "durationSeconds": 3,
    "props": { "text": "Too much news, no time to read?", "highlightWords": ["news"] }
  },
  {
    "type": "intro",
    "props": { "title": "Meet Ajako Taja", "subtitle": "Trending stories in seconds" }
  },
  {
    "type": "cta",
    "props": { "headline": "Download today", "buttonText": "Get the app" },
    "transitionIn": { "type": "wipe", "durationInFrames": 14 }
  }
]
```

### Import CSV

Spreadsheets work too. Columns: `order`, `type` (optional), `script`, `title` (optional), `media` (optional), `voice` (optional), `duration` in seconds (optional), `transition` (optional). The header must contain at least `script` or `media`. `media` and `voice` are file names of assets you have already uploaded to the project; a row with an image or video file and no type becomes an Image or Video scene. Rows are validated and problems are listed with their row numbers.

```csv
order,script,media,voice,duration
1,"Too much news?","intro.mp4","voice1.mp3",4
2,"Meet Ajako Taja","feature.jpg","voice2.mp3",5
```

## Transitions

A transition belongs to the scene it leads into. Click the chip between two cards on the timeline, or use the Transition group in the inspector.

Available: None, Fade, Slide left / right / up / down, Zoom, Wipe left / right / up / down, Flip, Clock wipe, Iris. The length is in frames, with half a second as a good default.

The Project inspector sets the default transition used for new scenes.

## Animations

- **Scene enter and exit** (Style group): fade, slide in any direction, scale, zoom, blur, and more. "Default" uses the type's own choreography.
- **Text animation** on Hook scenes: word by word, typewriter, pop, or any enter animation. Highlighted words take the brand accent colour.
- **Image motion** on Image scenes: Ken Burns, zoom in, zoom out, pan left, pan right, or none.
- **Overlay animations**: every overlay has an entrance, an exit and an optional loop such as pulse, float, wiggle, spin or blink. See [Overlays](media.md#overlays).
