import { Trash2, Upload, Music, Mic } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { Asset, AssetType } from '@guidedreel/schema';
import { assetUsageCounts } from '@guidedreel/engine';
import { getSceneDefinition } from '@guidedreel/schema';
import { useHost } from '../../host/HostContext';
import { useAssetImport } from '../../hooks/useAssetImport';
import { formatBytes, formatSeconds } from '../../lib/format';
import { cn } from '../../lib/cn';
import { pickedFileFromFile } from '../../platform/web';
import {
  Button,
  SectionTitle,
  Select,
  EmptyState,
  Badge,
  ConfirmDialog,
} from '../../primitives/index';
import { useEditorStore, useSelectedScene } from '../../store/editor-store';
import { useAssetUrls } from '../../hooks/useAssetUrls';
import { AssetThumb } from '../AssetPreview';

const FILTERS: { value: AssetType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'voiceover', label: 'Voiceovers' },
  { value: 'music', label: 'Music' },
  { value: 'logo', label: 'Logos' },
  { value: 'font', label: 'Fonts' },
];

export const AssetsPanel: React.FC = () => {
  const { platform, assetResolver } = useHost();
  const project = useEditorStore((s) => s.project);
  const removeAsset = useEditorStore((s) => s.removeAsset);
  const updateSceneProps = useEditorStore((s) => s.updateSceneProps);
  const setSceneVoiceover = useEditorStore((s) => s.setSceneVoiceover);
  const updateProject = useEditorStore((s) => s.updateProject);
  const cropScene = useEditorStore((s) => s.cropScene);
  const selected = useSelectedScene();
  const { importFiles } = useAssetImport();
  const [filter, setFilter] = useState<AssetType | 'all'>('all');
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Asset | null>(null);
  const assets = useMemo(() => project?.assets ?? [], [project]);
  const urls = useAssetUrls(assets, assetResolver);
  const usage = useMemo(() => (project ? assetUsageCounts(project) : {}), [project]);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = [...e.dataTransfer.files].map(pickedFileFromFile);
      if (files.length) await importFiles(files);
    },
    [importFiles],
  );

  if (!project) return null;
  const list = assets.filter((a) => filter === 'all' || a.type === filter);

  const assignTo = (asset: Asset) => {
    if (!selected) return;
    if (asset.type === 'voiceover' || asset.type === 'audio')
      return setSceneVoiceover(selected.id, asset.id);
    if (asset.type === 'music')
      return updateProject((p) => ({ ...p, audio: { ...p.audio, musicAssetId: asset.id } }));
    const key =
      selected.type === 'image'
        ? 'imageAssetId'
        : selected.type === 'video'
          ? 'videoAssetId'
          : selected.type === 'feature'
            ? 'mediaAssetId'
            : selected.type === 'product'
              ? 'imageAssetId'
              : selected.type === 'quote'
                ? 'avatarAssetId'
                : asset.type === 'logo'
                  ? 'logoAssetId'
                  : 'backgroundAssetId';
    updateSceneProps(selected.id, { [key]: asset.id });
    if (key === getSceneDefinition(selected.type).mediaKey) cropScene(selected.id);
  };

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <SectionTitle
        right={
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => importFiles(await platform.pickFiles({ multiple: true }))}
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
        }
      >
        Assets · {assets.length}
      </SectionTitle>
      <div className="px-3 pb-2">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as AssetType | 'all')}
          className="text-xs"
          aria-label="Filter assets"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>
      <div
        className={cn(
          'flex-1 overflow-y-auto px-3 pb-3',
          dragOver && 'outline-2 outline-dashed outline-primary -outline-offset-4 rounded-md',
        )}
      >
        {list.length === 0 ? (
          <EmptyState
            icon={<Upload />}
            title={assets.length === 0 ? 'No assets yet' : 'Nothing matches this filter'}
            description="Drop images, videos, audio or fonts here, or click Upload."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={async () => importFiles(await platform.pickFiles({ multiple: true }))}
              >
                <Upload className="h-3.5 w-3.5" /> Upload files
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {list.map((asset) => (
              <li
                key={asset.id}
                className="group relative rounded-md border border-border bg-surface-2 p-1.5"
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => assignTo(asset)}
                  title={selected ? `Use in "${selected.title ?? selected.type}"` : asset.name}
                >
                  <AssetThumb asset={asset} url={urls[asset.id]} className="aspect-video w-full" />
                  <div className="mt-1.5 truncate text-[11px] font-medium">{asset.name}</div>
                  <div className="flex items-center gap-1 text-[10px] text-fg-subtle">
                    <span className="capitalize">{asset.type}</span>
                    {asset.duration ? (
                      <span>· {formatSeconds(asset.duration)}</span>
                    ) : asset.width ? (
                      <span>
                        · {asset.width}×{asset.height}
                      </span>
                    ) : null}
                    <span>· {formatBytes(asset.size)}</span>
                  </div>
                </button>
                <div className="absolute right-1 top-1 flex items-center gap-1">
                  {usage[asset.id] ? (
                    <Badge tone="primary">
                      {usage[asset.id]} use{usage[asset.id]! > 1 ? 's' : ''}
                    </Badge>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(asset)}
                    className="rounded bg-surface/80 p-1 text-fg-subtle opacity-0 hover:text-danger group-hover:opacity-100"
                    aria-label={`Remove ${asset.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {asset.type === 'music' && project.audio.musicAssetId === asset.id ? (
                  <span
                    className="absolute bottom-1.5 right-1.5 rounded bg-primary/80 p-0.5 text-white"
                    title="Project music"
                  >
                    <Music className="h-3 w-3" />
                  </span>
                ) : null}
                {selected?.voiceoverAssetId === asset.id ? (
                  <span
                    className="absolute bottom-1.5 right-1.5 rounded bg-primary/80 p-0.5 text-white"
                    title="Voiceover of selected scene"
                  >
                    <Mic className="h-3 w-3" />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeAsset(confirmDelete.id)}
        title="Remove asset?"
        danger
        confirmLabel="Remove"
        message={
          <>
            “{confirmDelete?.name}” will be removed from this project
            {confirmDelete && usage[confirmDelete.id]
              ? ` and cleared from ${usage[confirmDelete.id]} place(s)`
              : ''}
            .
          </>
        }
      />
    </div>
  );
};
