import { AbsoluteFill, useVideoConfig } from 'remotion';
import { useTheme } from '../context';

/** Safe content area with consistent padding, centred by default. */
export const Content: React.FC<{
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  justify?: 'start' | 'center' | 'end' | 'space-between';
  style?: React.CSSProperties;
}> = ({ children, align = 'center', justify = 'center', style }) => {
  const { width, height } = useVideoConfig();
  const pad = Math.round(Math.min(width, height) * 0.08);
  return (
    <AbsoluteFill
      style={{
        padding: pad,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center',
        justifyContent:
          justify === 'start' ? 'flex-start' : justify === 'end' ? 'flex-end' : justify,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const Heading: React.FC<{
  children: React.ReactNode;
  size?: number;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
  color?: string;
}> = ({ children, size = 88, align = 'center', style, color }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        width: '100%',
        fontFamily: theme.fonts.heading,
        fontWeight: 800,
        fontSize: size * theme.scale,
        lineHeight: 1.08,
        letterSpacing: -size * theme.scale * 0.02,
        color: color ?? theme.colors.text,
        textAlign: align,
        textWrap: 'balance',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Body: React.FC<{
  children: React.ReactNode;
  size?: number;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
  color?: string;
}> = ({ children, size = 40, align = 'center', style, color }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        width: '100%',
        fontFamily: theme.fonts.body,
        fontWeight: 500,
        fontSize: size * theme.scale,
        lineHeight: 1.35,
        color: color ?? theme.colors.muted,
        textAlign: align,
        textWrap: 'pretty',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Pill: React.FC<{
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, color, style }) => {
  const theme = useTheme();
  const s = theme.scale;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${10 * s}px ${22 * s}px`,
        borderRadius: 999,
        background: color ?? theme.colors.accent,
        color: '#0B0F19',
        fontFamily: theme.fonts.body,
        fontWeight: 700,
        fontSize: 28 * s,
        letterSpacing: 1,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const TEXT_SIZES: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 44,
  md: 56,
  lg: 72,
  xl: 96,
};

/** Whether the frame is wider than tall; used to pick side-by-side layouts. */
export function useIsLandscape(): boolean {
  const { width, height } = useVideoConfig();
  return width > height;
}
