import { useSyncExternalStore } from 'react';
import { useEditorStore } from './editor-store';

/** Undo/redo availability, subscribed to the temporal store. */
export function useHistoryState(): { canUndo: boolean; canRedo: boolean } {
  const t = useEditorStore.temporal;
  const subscribe = (cb: () => void) => t.subscribe(cb);
  const canUndo = useSyncExternalStore(
    subscribe,
    () => t.getState().pastStates.length > 0,
    () => false,
  );
  const canRedo = useSyncExternalStore(
    subscribe,
    () => t.getState().futureStates.length > 0,
    () => false,
  );
  return { canUndo, canRedo };
}
