import { AbsoluteFill, Img, useVideoConfig } from 'remotion';
import { useAsset, useComposition } from '../context';

export const Watermark: React.FC = () => {
  const { project } = useComposition();
  const { width } = useVideoConfig();
  const wm = project.brand?.watermark;
  const { url } = useAsset(wm?.assetId);
  if (!wm || !url) return null;
  const size = width * wm.size;
  const margin = width * 0.04;
  const pos: React.CSSProperties = {
    position: 'absolute',
    ...(wm.position.includes('top') ? { top: margin } : { bottom: margin }),
    ...(wm.position.includes('left') ? { left: margin } : { right: margin }),
  };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Img src={url} style={{ ...pos, width: size, opacity: wm.opacity, objectFit: 'contain' }} />
    </AbsoluteFill>
  );
};
