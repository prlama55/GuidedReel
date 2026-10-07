import { Img } from 'remotion';
import { useAsset, useComposition, useTheme } from '../context';

export type BrandLogoProps = {
  /** Explicit asset id; falls back to the brand logo. */
  assetId?: string;
  /** Height in design px (scaled). */
  size?: number;
  style?: React.CSSProperties;
};

/** Brand logo image, or the brand initials in a rounded tile when there is no logo. */
export const BrandLogo: React.FC<BrandLogoProps> = ({ assetId, size = 120, style }) => {
  const theme = useTheme();
  const { project } = useComposition();
  const id = assetId ?? project.brand?.logoAssetId;
  const { url } = useAsset(id);
  const px = size * theme.scale;

  if (url) {
    return (
      <Img src={url} style={{ height: px, maxWidth: px * 3, objectFit: 'contain', ...style }} />
    );
  }
  const name = project.brand?.name ?? project.name;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      style={{
        height: px,
        width: px,
        borderRadius: px * 0.24,
        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
        color: theme.colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: theme.fonts.heading,
        fontWeight: 800,
        fontSize: px * 0.42,
        letterSpacing: -1,
        ...style,
      }}
    >
      {initials || 'V'}
    </div>
  );
};
