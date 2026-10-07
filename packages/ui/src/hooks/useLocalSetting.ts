import { useCallback, useEffect, useState } from 'react';

/** Per-browser preference (theme, defaults). Never used for project data. */
export function useLocalSetting<T extends string | number | boolean>(
  key: string,
  fallback: T,
): [T, (v: T) => void] {
  const full = `vc:${key}`;
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(full);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
  }, [full]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(full, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
    [full],
  );
  return [value, set];
}

export type ThemeSetting = 'system' | 'dark' | 'light';

export function applyTheme(theme: ThemeSetting): void {
  if (typeof document === 'undefined') return;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme;
  document.documentElement.dataset.theme = resolved;
}
