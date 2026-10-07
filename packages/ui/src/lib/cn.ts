import { clsx, type ClassValue } from 'clsx';

/** Class name helper (shadcn convention). Tailwind v4 handles conflicting utilities by source order, so no merge lib is needed. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
