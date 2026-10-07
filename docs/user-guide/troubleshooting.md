# Troubleshooting and FAQ

## The editor says my screen is too small

The editor needs at least 1280 pixels of width. Maximise the window, lower the display scaling, or use a larger screen. The Dashboard, Projects, Templates and Assets pages work at any size.

## I cannot find Settings or the music generator

Both are in the editor toolbar: the gear icon opens Settings and the Music button opens the generator. Settings is also in the sidebar of every page outside the editor, and on desktop in the app menu. Music is also in the inspector under the Project tab.

## The inspector only shows the scene, not the project settings

Use the Scene / Project switch at the top of the inspector. Project holds frame rate, default transition, music and volumes.

## A scene shows a red badge

Open Problems in the toolbar. Common causes: an asset was removed or, on desktop, the original file was moved; a video scene points past the end of its clip; text is too long for the frame. Each problem links to the scene.

## My image is cropped or has blurred bars

Auto fit fills the frame when the image is close to the video's aspect ratio and otherwise shows the whole image over a blurred copy. Set Fit to Cover to always fill, Contain to always show everything, or open Crop mode to choose the exact framing.

## A sticker does not appear when Animated is on

Animated stickers are fetched from Google's servers. Check the internet connection, or turn Animated off for the static version.

## Recording does not pick up sound

Pick the right microphone in the record dialog and watch the level meter. Check that the browser or the operating system allowed microphone access for the app. On macOS this is in System Settings → Privacy & Security → Microphone.

## Generated voice fails or the provider list is empty

For cloud providers, enter a valid API key in Settings → Voice providers and check the provider's account has credit. For Local voices on desktop, install at least one voice in Settings → Local voices. If the desktop app shows "No handler registered", the running app is older than the installed version; quit it fully and start it again.

## Export is slow

Draft quality is several times faster. Large video files and 60 fps add time. On the web, renders queue one at a time on the server. On desktop, close other heavy applications. The first render on a machine also downloads the headless browser used by the renderer.

## Export fails

Open the Render queue for the error message. Typical fixes: free up disk space, reassign missing media, shorten a video scene whose offset exceeds the clip, or try H.264 if another codec fails. On desktop, Help → Open Logs Folder has the detailed log.

## The web app lost my projects

Web projects live in the browser you used. Open the same browser and profile, and do not use a private window. Clearing site data deletes them, so export important projects with Export project from the Projects page and keep the `project.json`.

## Can I move a project between web and desktop

Yes. Export project on one side, Import on the other. Media is not embedded in `project.json`; upload or re-link the files after importing.

## Can I use my own fonts and non-Latin scripts

Yes. Upload TTF, OTF or WOFF2 in Assets and choose them in the Brand panel. The default fonts already cover Devanagari (Nepali, Hindi), CJK and Latin scripts.

## Is anything sent to a server

Web: your project and media are stored in your browser and sent to the render server only when you export. Desktop: nothing leaves the computer unless you use a cloud voice provider with your own key or animated stickers. No analytics are collected by the app.

## Does it use AI

No. The first version has no AI. Voice generation is text-to-speech from your own text, and music is composed from your scene structure by a procedural generator. The architecture leaves room for optional AI script generation in a later version.
