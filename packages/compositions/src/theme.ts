import type { BrandConfig, VideoFormat, VideoProject } from '@guidedreel/schema';
import { DEFAULT_BRAND } from '@guidedreel/schema';

export type Theme = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  /** Design scale: 1 at 1080px on the short side. Multiply every px value by this. */
  scale: number;
  radius: number;
  brand: BrandConfig | undefined;
};

/** Wide-coverage fallback stack (Latin, Devanagari, CJK). */
export const FONT_FALLBACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans JP', 'Helvetica Neue', Arial, sans-serif";

export function fontStack(family: string | undefined): string {
  return family ? `'${family}', ${FONT_FALLBACK}` : FONT_FALLBACK;
}

export function designScale(format: Pick<VideoFormat, 'width' | 'height'>): number {
  return Math.min(format.width, format.height) / 1080;
}

export function createTheme(project: Pick<VideoProject, 'brand' | 'settings' | 'format'>): Theme {
  const brand = project.brand;
  const colors = brand?.colors ?? DEFAULT_BRAND.colors;
  const heading = brand?.fonts.find((f) => f.role === 'heading')?.family;
  const body = brand?.fonts.find((f) => f.role === 'body')?.family;
  const base = project.settings.fontFamily;
  return {
    colors: {
      primary: colors.primary,
      secondary: colors.secondary ?? colors.primary,
      accent: colors.accent ?? colors.secondary ?? colors.primary,
      background: colors.background ?? project.settings.backgroundColor,
      text: colors.text ?? '#FFFFFF',
      muted: withAlpha(colors.text ?? '#FFFFFF', 0.7),
    },
    fonts: {
      heading: fontStack(heading ?? base),
      body: fontStack(body ?? base),
    },
    scale: designScale(project.format),
    radius: 28,
    brand,
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Perceived luminance 0..1 for picking text colours over a background. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
