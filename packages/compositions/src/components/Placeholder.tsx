import { useTheme } from '../context';
import { withAlpha } from '../theme';

/** Shown where media is expected but not yet assigned. Never appears if the project passes validation with media. */
export const Placeholder: React.FC<{ label?: string; style?: React.CSSProperties }> = ({
  label = 'Add media',
  style,
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `repeating-linear-gradient(45deg, ${withAlpha(theme.colors.text, 0.06)} 0 ${12 * theme.scale}px, transparent ${12 * theme.scale}px ${24 * theme.scale}px)`,
        border: `${2 * theme.scale}px dashed ${withAlpha(theme.colors.text, 0.3)}`,
        borderRadius: theme.radius * theme.scale,
        color: withAlpha(theme.colors.text, 0.6),
        fontFamily: theme.fonts.body,
        fontSize: 32 * theme.scale,
        ...style,
      }}
    >
      {label}
    </div>
  );
};
