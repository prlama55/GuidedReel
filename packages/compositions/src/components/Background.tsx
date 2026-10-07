import { AbsoluteFill, Img, OffthreadVideo } from 'remotion';
import { useAsset, useTheme } from '../context';
import { withAlpha } from '../theme';

export type BackgroundProps = {
  assetId?: string;
  color?: string;
  /** 0..1 darkening overlay over media so text stays readable. */
  dim?: number;
  variant?: 'solid' | 'gradient' | 'radial';
};

export const Background: React.FC<BackgroundProps> = ({
  assetId,
  color,
  dim = 0.45,
  variant = 'gradient',
}) => {
  const theme = useTheme();
  const { url, asset } = useAsset(assetId);
  const base = color ?? theme.colors.background;

  const fill =
    variant === 'solid'
      ? base
      : variant === 'radial'
        ? `radial-gradient(circle at 30% 20%, ${withAlpha(theme.colors.primary, 0.35)} 0%, ${base} 60%)`
        : `linear-gradient(160deg, ${base} 0%, ${withAlpha(theme.colors.primary, 0.25)} 100%)`;

  return (
    <AbsoluteFill style={{ background: fill }}>
      {url && asset?.type === 'video' ? (
        <OffthreadVideo
          src={url}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : url ? (
        <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      {url ? <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${dim})` }} /> : null}
    </AbsoluteFill>
  );
};
