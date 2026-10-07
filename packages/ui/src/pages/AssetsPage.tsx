import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { StoredAssetMeta } from '@guidedreel/storage';
import { AppShell } from './AppShell';
import { Button, ConfirmDialog, EmptyState, Skeleton, ASSET_ICONS } from '../primitives/index';
import { useHost } from '../host/HostContext';
import { formatBytes, formatRelative } from '../lib/format';

/** Library of every stored asset on this device (across projects). */
export const AssetsPage: React.FC = () => {
  const { storage } = useHost();
  const [items, setItems] = useState<StoredAssetMeta[] | null>(null);
  const [victim, setVictim] = useState<StoredAssetMeta | null>(null);
  const refresh = useCallback(async () => setItems(await storage.assets.list()), [storage]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const total = items?.reduce((a, m) => a + m.size, 0) ?? 0;

  return (
    <AppShell
      title="Assets"
      actions={
        items ? (
          <span className="text-xs text-fg-muted">
            {items.length} files · {formatBytes(total)}
          </span>
        ) : null
      }
    >
      <p className="mb-6 max-w-2xl text-sm text-fg-muted">
        Files uploaded in any project are stored here. Removing a file here does not edit projects;
        scenes that used it will show a missing-asset warning.
      </p>
      {items === null ? (
        <Skeleton className="h-40" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No assets stored"
          description="Upload images, video, audio or fonts from the editor's Assets panel."
        />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-fg-subtle">
            <tr>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Size</th>
              <th className="pb-2 font-medium">Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((m) => {
              const Icon = ASSET_ICONS[m.type];
              return (
                <tr key={m.key} className="border-t border-border">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-fg-subtle" />
                      <span className="truncate">{m.name}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-4 capitalize text-fg-muted">{m.type}</td>
                  <td className="py-2 pr-4 tabular-nums text-fg-muted">{formatBytes(m.size)}</td>
                  <td className="py-2 pr-4 text-fg-muted">{formatRelative(m.createdAt)}</td>
                  <td className="py-2 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setVictim(m)}
                      aria-label={`Delete ${m.name}`}
                      className="hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <ConfirmDialog
        open={victim !== null}
        onClose={() => setVictim(null)}
        onConfirm={async () => {
          if (victim) {
            await storage.assets.delete(victim.key);
            await refresh();
          }
        }}
        title="Delete file?"
        danger
        confirmLabel="Delete"
        message={<>“{victim?.name}” will be removed from this device.</>}
      />
    </AppShell>
  );
};
