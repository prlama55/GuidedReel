import { cn } from '../lib/cn';

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}> = ({ children, tone = 'neutral', className }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4',
      tone === 'neutral' && 'bg-surface-3 text-fg-muted',
      tone === 'primary' && 'bg-primary/15 text-primary',
      tone === 'success' && 'bg-success/15 text-success',
      tone === 'warning' && 'bg-warning/15 text-warning',
      tone === 'danger' && 'bg-danger/15 text-danger',
      className,
    )}
  >
    {children}
  </span>
);

export const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex min-w-[1.4rem] items-center justify-center rounded border border-border-strong bg-surface-2 px-1 font-mono text-[10px] text-fg-muted">
    {children}
  </kbd>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-surface-3', className)} aria-hidden />
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center',
      className,
    )}
  >
    {icon ? <div className="text-fg-subtle [&>svg]:h-8 [&>svg]:w-8">{icon}</div> : null}
    <div className="text-sm font-medium">{title}</div>
    {description ? <div className="max-w-sm text-xs text-fg-muted">{description}</div> : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);

export const SectionTitle: React.FC<{
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}> = ({ children, right, className }) => (
  <div className={cn('flex items-center justify-between px-3 pt-3 pb-2', className)}>
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
      {children}
    </h3>
    {right}
  </div>
);

export const Tabs: React.FC<{
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: React.ReactNode }[];
  className?: string;
}> = ({ value, onChange, items, className }) => (
  <div
    role="tablist"
    className={cn('inline-flex rounded-md bg-surface-2 p-0.5 border border-border', className)}
  >
    {items.map((it) => (
      <button
        key={it.value}
        role="tab"
        type="button"
        aria-selected={value === it.value}
        onClick={() => onChange(it.value)}
        className={cn(
          'rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors',
          value === it.value ? 'bg-surface-3 text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
        )}
      >
        {it.label}
      </button>
    ))}
  </div>
);

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={cn(
      'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
      className,
    )}
    aria-label="Loading"
  />
);
