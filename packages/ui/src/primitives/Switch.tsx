import { cn } from '../lib/cn';

export const Switch: React.FC<{
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
}> = ({ checked, onCheckedChange, id, disabled, ...rest }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
      checked ? 'bg-primary' : 'bg-border-strong',
    )}
    {...rest}
  >
    <span
      className={cn(
        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-[18px]' : 'translate-x-0.5',
      )}
    />
  </button>
);

export const Slider: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}> = ({ value, min, max, step = 1, onChange, disabled, className, ...rest }) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(Number(e.target.value))}
    className={cn('w-full accent-primary h-1.5 cursor-pointer', className)}
    {...rest}
  />
);
