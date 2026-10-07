import { useCallback, useEffect, useState } from 'react';
import type { ProjectSummary } from '@guidedreel/storage';
import { createId, deserializeProject, serializeProject, touchProject } from '@guidedreel/engine';
import { useHost } from '../host/HostContext';
import { useToast } from '../primitives/Toast';

/** Project list + common actions shared by Dashboard and Projects pages. */
export function useProjects() {
  const { storage, platform } = useHost();
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProjects(await storage.projects.list());
    } catch (err) {
      toast.push({
        kind: 'error',
        title: 'Could not load projects',
        description: err instanceof Error ? err.message : String(err),
      });
      setProjects([]);
    }
  }, [storage, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await storage.projects.delete(id);
      await refresh();
      toast.push({ kind: 'success', title: 'Project deleted' });
    },
    [storage, refresh, toast],
  );

  const duplicate = useCallback(
    async (id: string) => {
      const p = await storage.projects.get(id);
      if (!p) return;
      const copy = touchProject({
        ...p,
        id: createId('prj'),
        name: `${p.name} copy`,
        revision: 0,
        metadata: { ...p.metadata, createdAt: new Date().toISOString() },
      });
      await storage.projects.save(copy);
      await refresh();
    },
    [storage, refresh],
  );

  const exportJson = useCallback(
    async (id: string) => {
      const p = await storage.projects.get(id);
      if (!p) return;
      await platform.saveFile({
        suggestedName: `${p.name.replace(/[\\/:*?"<>|]/g, '')}.project.json`,
        mimeType: 'application/json',
        data: new Blob([serializeProject(p)], { type: 'application/json' }),
      });
    },
    [storage, platform],
  );

  const importJson = useCallback(async () => {
    const [file] = await platform.pickFiles({ multiple: false });
    if (!file?.blob) return null;
    const result = deserializeProject(await file.blob.text());
    if (!result.success) {
      toast.push({
        kind: 'error',
        title: 'Invalid project file',
        description: result.issues
          .slice(0, 2)
          .map((i) => `${i.path}: ${i.message}`)
          .join('; '),
      });
      return null;
    }
    const exists = await storage.projects.get(result.data.id);
    const project = exists
      ? { ...result.data, id: createId('prj'), name: `${result.data.name} (imported)` }
      : result.data;
    await storage.projects.save(project);
    await refresh();
    toast.push({ kind: 'success', title: `Imported "${project.name}"` });
    return project;
  }, [platform, storage, refresh, toast]);

  return { projects, refresh, remove, duplicate, exportJson, importJson };
}
