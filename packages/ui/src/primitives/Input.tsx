import { forwardRef } from 'react';
import { cn } from '../lib/cn';

const base =
  'w-full rounded-md border border-border bg-surface-2 px-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-border-strong disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(base, 'h-8', className)} {...rest} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea
    ref={ref}
    className={cn(base, 'py-1.5 leading-relaxed resize-y min-h-[60px]', className)}
    {...rest}
  />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(
        base,
        'h-8 pr-7 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:14px]',
        className,
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2399a3b8' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>")`,
      }}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }> = ({
  className,
  children,
  hint,
  ...rest
}) => (
  <label
    className={cn('flex items-center justify-between text-xs font-medium text-fg-muted', className)}
    {...rest}
  >
    <span>{children}</span>
    {hint ? <span className="text-fg-subtle font-normal">{hint}</span> : null}
  </label>
);

export const Field: React.FC<{
  label: React.ReactNode;
  hint?: string;
  htmlFor?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, htmlFor, description, children, className }) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <Label htmlFor={htmlFor} hint={hint}>
      {label}
    </Label>
    {children}
    {description ? <p className="text-[11px] text-fg-subtle leading-snug">{description}</p> : null}
  </div>
);
