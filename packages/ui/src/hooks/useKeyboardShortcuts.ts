import { useEffect } from 'react';

export type ShortcutHandlers = {
  togglePlay?: () => void;
  stepFrame?: (delta: number) => void;
  deleteSelection?: () => void;
  duplicate?: () => void;
  undo?: () => void;
  redo?: () => void;
  save?: () => void;
  showHelp?: () => void;
  escape?: () => void;
  export?: () => void;
  goToStart?: () => void;
  goToEnd?: () => void;
  /** Returns true when an overlay consumed the arrow key. dx/dy are frame fractions. */
  nudge?: (dx: number, dy: number) => boolean;
  /** Alt+←/→: move the selected scene in the order. */
  moveScene?: (direction: -1 | 1) => void;
  /** S: split the scene under the playhead. */
  split?: () => void;
  /** J / K / L shuttle: slower, pause, faster. */
  shuttle?: (key: 'J' | 'K' | 'L') => void;
};

function inEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** Global editor shortcuts. Ignored while typing in inputs (except Cmd/Ctrl combos). */
export function useKeyboardShortcuts(h: ShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const editable = inEditable(e.target);

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) h.redo?.();
        else h.undo?.();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        h.save?.();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd' && !editable) {
        e.preventDefault();
        h.duplicate?.();
        return;
      }
      if (mod && e.key.toLowerCase() === 'e' && !editable) {
        e.preventDefault();
        h.export?.();
        return;
      }
      if (e.key === 'Escape') {
        h.escape?.();
        return;
      }
      if (editable) return;

      if (e.key === ' ') {
        e.preventDefault();
        h.togglePlay?.();
      } else if (e.key.startsWith('Arrow') && e.altKey) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') h.moveScene?.(-1);
        if (e.key === 'ArrowRight') h.moveScene?.(1);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 0.02 : 0.005;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        if (h.nudge?.(dx, dy)) return;
        if (e.key === 'ArrowLeft') h.stepFrame?.(e.shiftKey ? -30 : -1);
        if (e.key === 'ArrowRight') h.stepFrame?.(e.shiftKey ? 30 : 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        h.goToStart?.();
      } else if (e.key === 'End') {
        e.preventDefault();
        h.goToEnd?.();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        h.deleteSelection?.();
      } else if (e.key === '?') {
        h.showHelp?.();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        h.split?.();
      } else if (e.key === 'j' || e.key === 'J') {
        h.shuttle?.('J');
      } else if (e.key === 'k' || e.key === 'K') {
        h.shuttle?.('K');
      } else if (e.key === 'l' || e.key === 'L') {
        h.shuttle?.('L');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h, enabled]);
}
