import { Plus, X, AlignLeft, AlignCenter, AlignRight, Upload, Crop } from 'lucide-react';
import type { Asset, AssetType, InspectorField } from '@guidedreel/schema';
import { Button, Field, Input, Select, Slider, Switch, Textarea } from '../../primitives/index';
import { cn } from '../../lib/cn';
import { AssetPreview } from '../AssetPreview';

export const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}> = ({ label, value, onChange, allowEmpty }) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
        aria-label={`${label} colour`}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#RRGGBB"
        className="font-mono text-xs"
      />
      {allowEmpty && value ? (
        <Button size="icon" variant="ghost" onClick={() => onChange('')} aria-label="Clear colour">
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  </Field>
);

export const ListField: React.FC<{
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  itemLabel?: string;
  maxItems?: number;
}> = ({ label, value, onChange, itemLabel = 'item', maxItems }) => (
  <Field label={label} hint={maxItems ? `${value.length}/${maxItems}` : undefined}>
    <div className="flex flex-col gap-1.5">
      {value.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            value={item}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
            placeholder={`${itemLabel} ${i + 1}`}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label={`Remove ${itemLabel}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        disabled={maxItems !== undefined && value.length >= maxItems}
        onClick={() => onChange([...value, ''])}
      >
        <Plus className="h-3.5 w-3.5" /> Add {itemLabel}
      </Button>
    </div>
  </Field>
);

export const AlignmentField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <Field label={label}>
    <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
      {[
        { v: 'left', I: AlignLeft },
        { v: 'center', I: AlignCenter },
        { v: 'right', I: AlignRight },
      ].map(({ v, I }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          aria-label={`Align ${v}`}
          className={cn(
            'rounded px-2.5 py-1',
            value === v ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:text-fg',
          )}
        >
          <I className="h-4 w-4" />
        </button>
      ))}
    </div>
  </Field>
);

export const AssetField: React.FC<{
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  assets: Asset[];
  assetTypes: AssetType[];
  onUpload?: () => void;
  /** Shown when the field holds the scene's framed media; opens Crop mode in the preview. */
  onCrop?: () => void;
  description?: string;
}> = ({ label, value, onChange, assets, assetTypes, onUpload, onCrop, description }) => {
  const matches = assets.filter(
    (a) =>
      assetTypes.includes(a.type) ||
      (assetTypes.includes('image') && a.type === 'logo') ||
      (assetTypes.includes('voiceover') && a.type === 'audio'),
  );
  const dangling = value && !assets.some((a) => a.id === value);
  return (
    <Field label={label} description={description}>
      <div className="flex gap-1.5">
        {value ? <AssetPreview assetId={value} className="h-8 w-12 shrink-0" /> : null}
        <Select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={cn(dangling && 'border-danger')}
        >
          <option value="">None</option>
          {dangling ? <option value={value}>Missing asset ({value})</option> : null}
          {matches.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        {onUpload ? (
          <Button
            size="icon"
            variant="outline"
            onClick={onUpload}
            aria-label="Upload"
            title="Upload a file"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {onCrop && value ? (
          <Button
            size="icon"
            variant="outline"
            onClick={onCrop}
            aria-label="Crop and reposition"
            title="Crop, zoom and reposition in the preview"
          >
            <Crop className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </Field>
  );
};

export type SchemaFieldProps = {
  field: InspectorField;
  value: unknown;
  onChange: (value: unknown) => void;
  assets: Asset[];
  onUpload?: (types: AssetType[]) => void;
  /** Provided for the scene's primary media field only. */
  onCrop?: () => void;
};

/** Renders one inspector field from its metadata. */
export const SchemaField: React.FC<SchemaFieldProps> = ({
  field,
  value,
  onChange,
  assets,
  onUpload,
  onCrop,
}) => {
  const id = `f-${field.key}`;
  switch (field.kind) {
    case 'text':
      return (
        <Field
          label={field.label}
          htmlFor={id}
          hint={field.maxLength ? `${String(value ?? '').length}/${field.maxLength}` : undefined}
          description={field.description}
        >
          <Input
            id={id}
            value={String(value ?? '')}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case 'textarea':
      return (
        <Field
          label={field.label}
          htmlFor={id}
          hint={field.maxLength ? `${String(value ?? '').length}/${field.maxLength}` : undefined}
          description={field.description}
        >
          <Textarea
            id={id}
            rows={field.rows ?? 3}
            value={String(value ?? '')}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case 'number': {
      const n = typeof value === 'number' ? value : (field.min ?? 0);
      return (
        <Field
          label={field.label}
          htmlFor={id}
          hint={field.slider ? String(n) : undefined}
          description={field.description}
        >
          {field.slider ? (
            <Slider
              value={n}
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              onChange={(v) => onChange(v)}
              aria-label={field.label}
            />
          ) : (
            <Input
              id={id}
              type="number"
              value={n}
              min={field.min}
              max={field.max}
              step={field.step}
              onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            />
          )}
        </Field>
      );
    }
    case 'color':
      return (
        <ColorField
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v || undefined)}
          allowEmpty
        />
      );
    case 'select':
      return (
        <Field label={field.label} htmlFor={id} description={field.description}>
          <Select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    case 'toggle':
      return (
        <div className="flex items-center justify-between py-1 text-xs">
          <label htmlFor={id} className="font-medium text-fg-muted">
            {field.label}
          </label>
          <Switch id={id} checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />
        </div>
      );
    case 'asset':
      return (
        <AssetField
          label={field.label}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          assets={assets}
          assetTypes={field.assetTypes}
          onUpload={onUpload ? () => onUpload(field.assetTypes) : undefined}
          onCrop={onCrop}
          description={field.description}
        />
      );
    case 'font':
      return (
        <Field label={field.label} htmlFor={id}>
          <Select
            id={id}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value || undefined)}
          >
            <option value="">Default</option>
            {assets
              .filter((a) => a.type === 'font')
              .map((a) => (
                <option key={a.id} value={a.fontFamily ?? a.name}>
                  {a.fontFamily ?? a.name}
                </option>
              ))}
          </Select>
        </Field>
      );
    case 'alignment':
      return (
        <AlignmentField label={field.label} value={String(value ?? 'center')} onChange={onChange} />
      );
    case 'list':
      return (
        <ListField
          label={field.label}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          itemLabel={field.itemLabel}
          maxItems={field.maxItems}
        />
      );
    default:
      return null;
  }
};
