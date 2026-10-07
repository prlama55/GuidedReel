import { cn } from '../lib/cn';

/**
 * GuidedReel mark: a dotted guide track leading into a play triangle on the
 * brand gradient. Same artwork as the app icon (docs/branding).
 */
export const BrandMark: React.FC<{ className?: string; title?: string }> = ({
  className,
  title = 'GuidedReel',
}) => (
  <svg
    viewBox="0 0 1024 1024"
    role="img"
    aria-label={title}
    className={cn('h-7 w-7 shrink-0', className)}
  >
    <defs>
      <linearGradient id="vc-brand-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6366F1" />
        <stop offset="1" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="224" fill="url(#vc-brand-bg)" />
    <g fill="#fff">
      <circle cx="262" cy="300" r="42" />
      <circle cx="262" cy="512" r="42" opacity=".75" />
      <circle cx="262" cy="724" r="42" opacity=".5" />
    </g>
    <path d="M372 268q0-52 46-28l348 246q34 28 0 56L418 788q-46 24-46-28z" fill="#fff" />
  </svg>
);
