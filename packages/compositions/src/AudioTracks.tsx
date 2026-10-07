import { Audio, Sequence, useVideoConfig } from 'remotion';
import { interpolate } from 'remotion';
import { useComposition } from './context';

/**
 * Voiceover clips positioned at their scene start and a looping music bed
 * with ducking under voiceovers and a fade-out at the end.
 */
export const AudioTracks: React.FC = () => {
  const { project, assetUrls, timeline } = useComposition();
  const { durationInFrames } = useVideoConfig();
  const voice = timeline.tracks.find((t) => t.kind === 'voiceover')?.items ?? [];
  const music = timeline.tracks.find((t) => t.kind === 'music')?.items[0];
  const musicUrl = music ? assetUrls[music.refId] : undefined;
  const { musicVolume, duckMusic, voiceoverVolume, fadeOutFrames } = project.audio;

  const musicVolumeAt = (frame: number): number => {
    const fade =
      fadeOutFrames > 0
        ? interpolate(frame, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 1;
    const fadeIn = interpolate(frame, [0, 20], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const underVoice = duckMusic && voice.some((v) => frame >= v.startFrame && frame < v.endFrame);
    return Math.max(0, Math.min(1, musicVolume * fade * fadeIn * (underVoice ? 0.3 : 1)));
  };

  return (
    <>
      {voice.map((item) => {
        const url = assetUrls[item.refId];
        if (!url) return null;
        return (
          <Sequence
            key={item.id}
            from={item.startFrame}
            durationInFrames={item.durationInFrames}
            name={`voice ${item.refId}`}
          >
            <Audio src={url} volume={voiceoverVolume} />
          </Sequence>
        );
      })}
      {musicUrl ? <Audio src={musicUrl} loop volume={musicVolumeAt} name="music" /> : null}
    </>
  );
};
