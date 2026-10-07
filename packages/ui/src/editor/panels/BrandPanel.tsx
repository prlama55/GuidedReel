import { Upload } from 'lucide-react';
import { DEFAULT_BRAND, type BrandConfig } from '@guidedreel/schema';
import { Button, Field, Input, SectionTitle, Select, Switch } from '../../primitives/index';
import { useEditorStore } from '../../store/editor-store';
import { useAssetImport } from '../../hooks/useAssetImport';
import { useHost } from '../../host/HostContext';
import { ColorField } from '../inspector/fields';

export const BrandPanel: React.FC = () => {
  const { platform } = useHost();
  const project = useEditorStore((s) => s.project);
  const updateProject = useEditorStore((s) => s.updateProject);
  const { importFiles } = useAssetImport();
  if (!project) return null;
  const brand: BrandConfig = project.brand ?? { ...DEFAULT_BRAND, name: project.name };
  const setBrand = (patch: Partial<BrandConfig>) =>
    updateProject((p) => ({
      ...p,
      brand: { ...(p.brand ?? { ...DEFAULT_BRAND, name: p.name }), ...patch },
    }));
  const setColor = (key: keyof BrandConfig['colors'], value: string) =>
    setBrand({ colors: { ...brand.colors, [key]: value } });
  const logos = project.assets.filter((a) => a.type === 'logo' || a.type === 'image');
  const fonts = project.assets.filter((a) => a.type === 'font');

  return (
    <div className="flex h-full flex-col">
      <SectionTitle>Brand kit</SectionTitle>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 p-2.5 text-xs">
          <span>Use brand kit in this video</span>
          <Switch
            checked={!!project.brand}
            onCheckedChange={(v) =>
              updateProject((p) => ({
                ...p,
                brand: v ? { ...DEFAULT_BRAND, name: p.name } : undefined,
              }))
            }
            aria-label="Enable brand kit"
          />
        </div>
        {project.brand ? (
          <>
            <Field label="Brand name">
              <Input value={brand.name} onChange={(e) => setBrand({ name: e.target.value })} />
            </Field>
            <Field label="Logo">
              <div className="flex gap-2">
                <Select
                  value={brand.logoAssetId ?? ''}
                  onChange={(e) => setBrand({ logoAssetId: e.target.value || undefined })}
                  className="flex-1"
                >
                  <option value="">None (use initials)</option>
                  {logos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  onClick={async () => {
                    const [a] = await importFiles(
                      await platform.pickFiles({ multiple: false, assetTypes: ['logo'] }),
                      'logo',
                    );
                    if (a) setBrand({ logoAssetId: a.id });
                  }}
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Primary"
                value={brand.colors.primary}
                onChange={(v) => setColor('primary', v)}
              />
              <ColorField
                label="Secondary"
                value={brand.colors.secondary ?? brand.colors.primary}
                onChange={(v) => setColor('secondary', v)}
              />
              <ColorField
                label="Accent"
                value={brand.colors.accent ?? '#F59E0B'}
                onChange={(v) => setColor('accent', v)}
              />
              <ColorField
                label="Background"
                value={brand.colors.background ?? project.settings.backgroundColor}
                onChange={(v) => setColor('background', v)}
              />
              <ColorField
                label="Text"
                value={brand.colors.text ?? '#FFFFFF'}
                onChange={(v) => setColor('text', v)}
              />
            </div>
            <Field
              label="Heading font"
              description="Upload a .ttf/.otf/.woff2 in Assets, then pick it here."
            >
              <Select
                value={brand.fonts.find((f) => f.role === 'heading')?.assetId ?? ''}
                onChange={(e) => {
                  const asset = fonts.find((a) => a.id === e.target.value);
                  const rest = brand.fonts.filter((f) => f.role !== 'heading');
                  setBrand({
                    fonts: asset
                      ? [
                          ...rest,
                          {
                            family: asset.fontFamily ?? asset.name,
                            assetId: asset.id,
                            weight: 700,
                            role: 'heading',
                          },
                        ]
                      : rest,
                  });
                }}
              >
                <option value="">Default ({project.settings.fontFamily})</option>
                {fonts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fontFamily ?? a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Body font">
              <Select
                value={brand.fonts.find((f) => f.role === 'body')?.assetId ?? ''}
                onChange={(e) => {
                  const asset = fonts.find((a) => a.id === e.target.value);
                  const rest = brand.fonts.filter((f) => f.role !== 'body');
                  setBrand({
                    fonts: asset
                      ? [
                          ...rest,
                          {
                            family: asset.fontFamily ?? asset.name,
                            assetId: asset.id,
                            weight: 400,
                            role: 'body',
                          },
                        ]
                      : rest,
                  });
                }}
              >
                <option value="">Default ({project.settings.fontFamily})</option>
                {fonts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fontFamily ?? a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="CTA button style">
              <Select
                value={brand.ctaStyle}
                onChange={(e) => setBrand({ ctaStyle: e.target.value as BrandConfig['ctaStyle'] })}
              >
                <option value="solid">Solid</option>
                <option value="outline">Outline</option>
                <option value="pill">Pill</option>
              </Select>
            </Field>
            <Field label="Watermark">
              <Select
                value={brand.watermark?.assetId ?? ''}
                onChange={(e) =>
                  setBrand({
                    watermark: e.target.value
                      ? {
                          assetId: e.target.value,
                          position: 'bottom-right',
                          opacity: 0.8,
                          size: 0.12,
                        }
                      : undefined,
                  })
                }
              >
                <option value="">None</option>
                {logos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <p className="text-xs text-fg-muted">
            Turn on the brand kit to set colours, logo, fonts and a watermark that every scene uses.
          </p>
        )}
      </div>
    </div>
  );
};
