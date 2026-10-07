import type { AssetType } from '../asset';

export type InspectorGroup = 'Content' | 'Media' | 'Timing' | 'Transition' | 'Style';

export type InspectorFieldBase = {
  /** Dot-free key inside scene.props. */
  key: string;
  label: string;
  group: InspectorGroup;
  description?: string;
  placeholder?: string;
};

export type InspectorField =
  | (InspectorFieldBase & { kind: 'text'; maxLength?: number })
  | (InspectorFieldBase & { kind: 'textarea'; rows?: number; maxLength?: number })
  | (InspectorFieldBase & {
      kind: 'number';
      min?: number;
      max?: number;
      step?: number;
      slider?: boolean;
    })
  | (InspectorFieldBase & { kind: 'color' })
  | (InspectorFieldBase & { kind: 'select'; options: { label: string; value: string }[] })
  | (InspectorFieldBase & { kind: 'toggle' })
  | (InspectorFieldBase & { kind: 'asset'; assetTypes: AssetType[] })
  | (InspectorFieldBase & { kind: 'font' })
  | (InspectorFieldBase & { kind: 'alignment' })
  | (InspectorFieldBase & { kind: 'list'; itemLabel?: string; maxItems?: number });

export type InspectorFieldKind = InspectorField['kind'];
