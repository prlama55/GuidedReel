import { useEffect, useRef } from 'react';
import type { VideoProject } from '@guidedreel/schema';
import { touchProject } from '@guidedreel/engine';
import { useHost } from '../host/HostContext';
import { useEditorStore } from '../store/editor-store';

/**
 * Persists the project ~800ms after the last change. Bumps revision/updatedAt
 * without creating an undo entry. Also warns before unload with unsaved work.
 */
export function useAutosave(delayMs = 800): void {
  const { storage, platform } = useHost();
  const project = useEditorStore((s) => s.project);
  const saveState = useEditorStore((s) => s.saveState);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project || saveState !== 'unsaved') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const store = useEditorStore.getState();
      const current = store.project;
      if (!current) return;
      store.setSaveState('saving');
      const touched = touchProject(current);
      try {
        await storage.projects.save(touched);
        // Only commit if nothing changed meanwhile.
        if (useEditorStore.getState().project === current) store.commitSaved(touched);
        else useEditorStore.getState().setSaveState('unsaved');
      } catch (err) {
        console.error('[autosave] failed', err);
        store.setSaveState('error');
      }
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [project, saveState, storage, delayMs]);

  useEffect(() => {
    platform.setDocumentEdited?.(saveState === 'unsaved' || saveState === 'saving');
    // Desktop asks natively on window close (see apps/desktop main); beforeunload would block it silently.
    if (typeof window === 'undefined' || platform.name === 'desktop') return;
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === 'unsaved' || saveState === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState, platform]);
}

/** Saves immediately (Cmd/Ctrl+S). */
export async function saveNow(save: (p: VideoProject) => Promise<void>): Promise<void> {
  const store = useEditorStore.getState();
  if (!store.project) return;
  store.setSaveState('saving');
  const touched = touchProject(store.project);
  try {
    await save(touched);
    store.commitSaved(touched);
  } catch (err) {
    console.error('[save] failed', err);
    store.setSaveState('error');
  }
}
