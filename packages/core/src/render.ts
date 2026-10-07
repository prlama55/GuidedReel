/**
 * Node-only rendering: VideoRenderer interface, LocalRemotionRenderer, bundle helpers and
 * the asset server. Keep this out of browser bundles; mark it external in server bundlers
 * (Remotion spawns native binaries).
 */
export * from '@guidedreel/renderer';
