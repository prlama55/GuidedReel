import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeRecording } from './wav';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error';

export type Take = { blob: Blob; durationSeconds: number; url: string };

/**
 * Microphone recorder: device list, live input level and a finalised WAV take.
 * Works in the browser and in Electron (getUserMedia in the renderer).
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<Take | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const startedAt = useRef(0);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === 'audioinput'));
    } catch {
      setDevices([]);
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const start = useCallback(async () => {
    setError(null);
    setTake((t) => {
      if (t) URL.revokeObjectURL(t.url);
      return null;
    });
    setState('requesting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.current = media;
      await refreshDevices();

      // Level meter
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      // Created after an await, so it may start suspended under autoplay rules.
      await ctx.resume().catch(() => undefined);
      const source = ctx.createMediaStreamSource(media);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        setElapsed((performance.now() - startedAt.current) / 1000);
        raf.current = requestAnimationFrame(tick);
      };

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      recorder.current = rec;
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.start(250);
      startedAt.current = performance.now();
      setElapsed(0);
      setState('recording');
      raf.current = requestAnimationFrame(tick);
    } catch (err) {
      cleanupStream();
      setState('error');
      setError(
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Microphone access was denied. Allow it in your browser or system settings and try again.'
            : err.message
          : String(err),
      );
    }
  }, [deviceId, refreshDevices, cleanupStream]);

  const stop = useCallback(async (): Promise<Take | null> => {
    const rec = recorder.current;
    if (!rec || rec.state === 'inactive') return null;
    setState('processing');
    const raw = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' }));
      rec.stop();
    });
    cleanupStream();
    try {
      const finalised = await finalizeRecording(raw);
      const t: Take = {
        blob: finalised.blob,
        durationSeconds: finalised.durationSeconds,
        url: URL.createObjectURL(finalised.blob),
      };
      setTake(t);
      setState('idle');
      return t;
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [cleanupStream]);

  const discard = useCallback(() => {
    setTake((t) => {
      if (t) URL.revokeObjectURL(t.url);
      return null;
    });
  }, []);

  return {
    state,
    error,
    devices,
    deviceId,
    setDeviceId,
    level,
    elapsed,
    take,
    start,
    stop,
    discard,
    refreshDevices,
  };
}
