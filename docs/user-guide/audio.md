# Audio

A video has two audio layers: one **voiceover per scene** and one **music track** for the whole project. Both are ordinary audio assets, so you can also upload files you recorded or bought elsewhere and assign them in the same places.

## Recording a voiceover

1. Select the scene and click the **microphone** in the preview bar, or "Record voiceover" in the scene's Timing group.
2. Choose a microphone. The level meter shows your input.
3. Optionally turn on "Play scene while recording" to see the scene silently while you speak.
4. Press Record, speak, press Stop. Listen to the take with Preview.
5. Keep "Fit scene to recording" on if you want the scene to last as long as the take, then press Use.

Takes are trimmed of leading and trailing silence, normalised to a consistent loudness and saved as WAV voiceover assets. Record as many takes as you like; unused ones stay in Assets until you remove them.

The browser or the operating system asks for microphone permission the first time.

## Generated voiceover

"Generate voiceover" in the Timing group speaks the scene text with a text-to-speech voice. "Generate voiceovers for all scenes" in the Project inspector does every scene at once. Pick a provider and a voice, filter voices by name or language code such as `ne-NP` or `en`, set the speed, preview, and press Use. "Fit scene length to the voiceover" sets the scene to follow the audio length.

Providers:

- **Local (desktop only, free, offline)**. Uses Piper voices running on your computer. Install voices from Settings → Local voices. Each voice is a 20 to 75 MB download; the engine itself is about 20 to 45 MB. Nothing leaves your machine. Voices include Nepali, Hindi, English and more.
- **OpenAI**, **ElevenLabs**, **Google Cloud Text-to-Speech**. Available on web and desktop with **your own API key**, entered once in Settings → Voice providers. The key is stored on your device only, in the browser on the web and encrypted by the operating system on desktop, and is sent straight to the provider when you generate. The app's authors never see it. Provider usage is billed to your own account.

Scenes set to follow their voiceover re-time themselves automatically when you regenerate.

## Background music

Click **Music** in the toolbar or "Generate music from scenes" in the Project inspector. The generator composes a track from the structure of your video: the scene count and pacing set the tempo, the intensity rises toward the call to action, and the track ends exactly with the video.

Controls:

- **Mood**: a style suggested from your template, such as upbeat, calm, corporate or dramatic.
- **Energy**: Soft (a sparse bed of pads and a light pulse), Medium (balanced), Hard (driving with full drums). Energy also nudges the tempo.
- **Tempo**: automatic from your scenes, or set a BPM.
- **Generate** and **Variation**: the same settings always give the same track; Variation gives a new one with the same settings.
- Listen with the player, then choose the **Mix**:

| Mix        | Music volume | Under a voiceover              | Use for                   |
| ---------- | ------------ | ------------------------------ | ------------------------- |
| Background | 15%          | Dips to about 5% automatically | Narrated videos (default) |
| Balanced   | 30%          | Dips under the voice           | Light narration           |
| Foreground | 60%          | No dipping                     | Videos without narration  |

- **Align scene cuts to the beat** rounds each scene's length so cuts land on beats of the generated tempo.
- **Use as project music** saves the track as a music asset, attaches it to the project and applies the mix.

For a quiet, unobtrusive bed under speech, pair **Soft** energy with the **Background** mix.

### Using your own music

Upload a music file in Assets and pick it in the Project inspector's Music group. **Detect tempo** estimates its BPM and **Align scene cuts** snaps your scenes to it, the same as for generated tracks.

## Volumes, ducking and fades

In the Project inspector's Music group:

- **Music volume** and **Voiceover volume** are the levels in the export.
- **Duck music under voiceover** lowers the music to about a third of its level whenever a voiceover plays and brings it back between scenes.
- Music fades in at the start and out at the end of the video.

The volume slider in the preview bar only affects what you hear while editing.

## Export without audio

The Export dialog has an "Export without audio" switch for silent versions, for example when a platform will add its own soundtrack.
