import { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, Check } from 'lucide-react';
import type { PlayerRef } from '@remotion/player';
import { calculateTimeline } from '@guidedreel/engine';
import { Button, Dialog, Select, Switch, useToast } from '../primitives/index';
import { useRecorder } from '../audio/useRecorder';
import { useAssetImport } from '../hooks/useAssetImport';
import { useEditorStore } from '../store/editor-store';
import { formatSeconds } from '../lib/format';
import { cn } from '../lib/cn';

/**
 * Record a voiceover for the selected scene. The scene can play (muted) while
 * you record so you can time your narration; the take is trimmed, normalised,
 * saved as a WAV asset and attached to the scene, whose duration can follow it.
 */
export const RecordDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  sceneId: string;
  playerRef: React.RefObject<PlayerRef | null>;
}> = ({ open, onClose, sceneId, playerRef }) => {
  const rec = useRecorder();
  const { importFiles } = useAssetImport();
  const toast = useToast();
  const project = useEditorStore((s) => s.project);
  const setSceneVoiceover = useEditorStore((s) => s.setSceneVoiceover);
  const updateScene = useEditorStore((s) => s.updateScene);
  const [playWhileRecording, setPlayWhileRecording] = useState(true);
  const [fitScene, setFitScene] = useState(true);
  const [saving, setSaving] = useState(false);
  const wasMuted = useRef(false);
  const scene = project?.scenes.find((s) => s.id === sceneId);

  useEffect(() => {
    if (open) void rec.refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startSceneForRecording = () => {
    const p = playerRef.current;
    if (!p || !project || !playWhileRecording) return;
    const item = calculateTimeline(project).scenes[sceneId];
    if (!item) return;
    wasMuted.current = p.isMuted();
    p.mute();
    p.seekTo(item.startFrame);
    p.play();
  };
  const stopScene = () => {
    const p = playerRef.current;
    if (!p) return;
    p.pause();
    if (!wasMuted.current) p.unmute();
  };

  const onStart = async () => {
    await rec.start();
    startSceneForRecording();
  };
  const onStop = async () => {
    stopScene();
    await rec.stop();
  };

  const applyTake = async () => {
    if (!rec.take || !scene) return;
    setSaving(true);
    try {
      const name = `Recording ${scene.title ?? scene.type} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.wav`;
      const [asset] = await importFiles(
        [{ name, size: rec.take.blob.size, mimeType: 'audio/wav', blob: rec.take.blob }],
        'voiceover',
      );
      if (!asset) return;
      setSceneVoiceover(scene.id, asset.id);
      if (!fitScene) updateScene(scene.id, { durationMode: 'fixed' });
      toast.push({
        kind: 'success',
        title: 'Voiceover attached',
        description: fitScene ? 'The scene now follows the recording length.' : undefined,
      });
      rec.discard();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (rec.state === 'recording') void onStop();
    rec.discard();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Record voiceover"
      description={
        scene
          ? `For "${scene.title ?? scene.type}" · ${formatSeconds(scene.durationInFrames / (project?.format.fps ?? 30))} scene`
          : undefined
      }
      size="md"
      locked={rec.state === 'recording'}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
            Microphone
            <Select
              value={rec.deviceId}
              onChange={(e) => rec.setDeviceId(e.target.value)}
              disabled={rec.state === 'recording'}
              aria-label="Microphone"
            >
              <option value="">System default</option>
              {rec.devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-center gap-2 pb-1 text-xs text-fg-muted">
            Play scene while recording{' '}
            <Switch
              checked={playWhileRecording}
              onCheckedChange={setPlayWhileRecording}
              disabled={rec.state === 'recording'}
              aria-label="Play scene while recording"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2 p-4">
          {rec.state === 'recording' ? (
            <Button
              variant="danger"
              size="lg"
              onClick={() => void onStop()}
              aria-label="Stop recording"
              className="h-14 w-14 rounded-full p-0"
            >
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => void onStart()}
              aria-label="Start recording"
              loading={rec.state === 'requesting' || rec.state === 'processing'}
              className="h-14 w-14 rounded-full bg-danger p-0 hover:opacity-90"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className={cn('font-medium', rec.state === 'recording' && 'text-danger')}>
                {rec.state === 'recording'
                  ? 'Recording…'
                  : rec.state === 'processing'
                    ? 'Processing take…'
                    : rec.state === 'requesting'
                      ? 'Waiting for microphone…'
                      : rec.take
                        ? 'Take ready'
                        : 'Ready'}
              </span>
              <span className="font-mono tabular-nums text-fg-muted" data-testid="record-elapsed">
                {rec.state === 'recording'
                  ? formatSeconds(rec.elapsed)
                  : rec.take
                    ? formatSeconds(rec.take.durationSeconds)
                    : '0s'}
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
              aria-label="Input level"
              role="meter"
              aria-valuenow={Math.round(rec.level * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-75',
                  rec.level > 0.8 ? 'bg-danger' : 'bg-success',
                )}
                style={{ width: `${Math.round(rec.level * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {rec.error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
            {rec.error}
          </div>
        ) : null}

        {rec.take ? (
          <div className="flex flex-col gap-3 rounded-lg border border-success/40 bg-success/5 p-3">
            <audio controls src={rec.take.url} className="w-full" aria-label="Preview take" />
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>
                Silence trimmed · level normalised · {formatSeconds(rec.take.durationSeconds)}
              </span>
              <label className="flex items-center gap-2">
                Fit scene to recording{' '}
                <Switch
                  checked={fitScene}
                  onCheckedChange={setFitScene}
                  aria-label="Fit scene to recording"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  rec.discard();
                  void onStart();
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Record again
              </Button>
              <Button variant="primary" size="sm" onClick={() => void applyTake()} loading={saving}>
                <Check className="h-3.5 w-3.5" /> Use for this scene
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-fg-subtle">
            Tip: turn on “Play selected scene only” in the preview and rehearse before recording.
            Multiple takes are kept as separate assets; the latest one is attached.
          </p>
        )}
      </div>
    </Dialog>
  );
};
