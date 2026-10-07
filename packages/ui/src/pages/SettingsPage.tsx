import { useEffect } from 'react';
import {
  FORMAT_PRESET_LIST,
  type AspectRatio,
  type RenderQuality,
  QUALITY_PRESETS,
} from '@guidedreel/schema';
import { AppShell } from './AppShell';
import { Field, Select } from '../primitives/index';
import { applyTheme, useLocalSetting, type ThemeSetting } from '../hooks/useLocalSetting';
import { useHost } from '../host/HostContext';
import { ProvidersSettings } from './ProvidersSettings';

export const SettingsPage: React.FC = () => {
  const { platform, appVersion } = useHost();
  const [theme, setTheme] = useLocalSetting<ThemeSetting>('theme', 'system');
  const [format, setFormat] = useLocalSetting<AspectRatio>('defaultFormat', '9:16');
  const [quality, setQuality] = useLocalSetting<RenderQuality>('defaultQuality', 'standard');
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <AppShell title="Settings">
      <div className="flex max-w-lg flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <Field label="Theme">
            <Select value={theme} onChange={(e) => setTheme(e.target.value as ThemeSetting)}>
              <option value="system">Follow system</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </Select>
          </Field>
        </section>
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Defaults for new projects</h2>
          <Field label="Format">
            <Select value={format} onChange={(e) => setFormat(e.target.value as AspectRatio)}>
              {FORMAT_PRESET_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Render quality">
            <Select value={quality} onChange={(e) => setQuality(e.target.value as RenderQuality)}>
              {(Object.keys(QUALITY_PRESETS) as RenderQuality[]).map((q) => (
                <option key={q} value={q}>
                  {QUALITY_PRESETS[q].label} — {QUALITY_PRESETS[q].hint}
                </option>
              ))}
            </Select>
          </Field>
        </section>
        <ProvidersSettings />
        <section className="rounded-lg border border-border bg-surface p-4 text-xs text-fg-muted">
          <h2 className="mb-2 text-sm font-semibold text-fg">About</h2>
          <p>
            GuidedReel {appVersion ? `v${appVersion}` : ''} ·{' '}
            {platform.name === 'desktop' ? 'Desktop' : 'Web'} edition. Developed by Padma Raj Lama.
          </p>
          <p className="mt-1">
            Projects and assets are stored{' '}
            {platform.name === 'desktop'
              ? 'in your local app data folder'
              : 'in this browser (IndexedDB)'}
            . Export a project as JSON to move it between devices.
          </p>
        </section>
      </div>
    </AppShell>
  );
};
