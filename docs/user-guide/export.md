# Export and rendering

## The Export dialog

Click **Export** in the toolbar or press Cmd E (Ctrl E on Windows and Linux).

- **Output** summarises the format and frame rate.
- **Quality**: Draft renders at half resolution and is fast, for checking timing. Standard is full resolution and the right choice for publishing. High uses a larger file for the best picture.
- **Codec**: H.264 MP4 is recommended and plays everywhere. H.265 MP4 gives smaller files on devices that support it. VP9 WebM is for the web. ProRes MOV is a large, edit-friendly master for further editing.
- **File name**: the name without extension.
- **Export without audio**: a silent file.
- **Length** and **estimated size** update as you change the settings.

Export is blocked while the Problems list has errors such as missing media, so fix those first. Warnings do not block.

## Progress

The dialog shows the stages: Queued, Preparing, Rendering with the frame count, Encoding, Uploading on the web, then Done. You can cancel at any time. The same information is on the **Render queue** page, which keeps a history of every export with its status, duration and output.

## Where the file goes

- **Web**: when the render finishes, click **Download**. The server keeps the file available from the Render queue page for a while.
- **Desktop**: you choose the folder and name in a native save dialog before the render starts. When it finishes, use **Open** to play it or **Reveal in Finder / Explorer** to see it. Nothing is uploaded.

## How long does it take

Rendering is roughly real time to a few times real time depending on the computer, resolution and the amount of video media. The first render on a machine downloads a headless browser used by the video engine, which adds a minute. Draft quality is several times faster than Standard.

## Tips

- Export a Draft first to check timing, then a Standard for publishing.
- Keep videos short for social platforms. The timeline shows the total length next to the format selector.
- Use the Safe zones toggle in 9:16 before exporting so platform buttons do not cover your text.
