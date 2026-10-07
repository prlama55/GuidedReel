import type {
  Asset,
  AssetType,
  VideoProjectDraft,
  VideoFormat,
  AspectRatio,
} from '@guidedreel/schema';

/**
 * ---------------------------------------------------------------------------
 * Extension points for later phases. Nothing here is implemented in V1; the
 * interfaces exist so that AI and asset providers plug into the same project
 * schema without touching the editor, templates or renderer.
 * ---------------------------------------------------------------------------
 */

export type ContentGenerationInput = {
  /** Natural-language brief, article text, product description, ... */
  prompt: string;
  /** Preferred template; the generator may pick another supported one. */
  templateId?: string;
  aspectRatio?: AspectRatio;
  format?: VideoFormat;
  /** Target length in seconds. */
  targetDurationSeconds?: number;
  language?: string;
  tone?: string;
  /** Assets the user already uploaded that the generator may reference. */
  availableAssets?: Asset[];
  brandName?: string;
};

export interface VideoContentGenerator {
  readonly id: string;
  generate(
    input: ContentGenerationInput,
    options?: { signal?: AbortSignal },
  ): Promise<VideoProjectDraft>;
}

export type GeneratedAsset = { asset: Asset; previewUrl?: string };

export interface ImageProvider {
  readonly id: string;
  generateImage(
    prompt: string,
    options?: { width?: number; height?: number; signal?: AbortSignal },
  ): Promise<GeneratedAsset>;
}

export interface VideoProvider {
  readonly id: string;
  generateVideo(
    prompt: string,
    options?: { durationSeconds?: number; format?: VideoFormat; signal?: AbortSignal },
  ): Promise<GeneratedAsset>;
}

export interface AudioProvider {
  readonly id: string;
  generateMusic(
    prompt: string,
    options?: { durationSeconds?: number; signal?: AbortSignal },
  ): Promise<GeneratedAsset>;
}

export type TtsVoice = {
  id: string;
  name: string;
  /** BCP-47 language tag(s) the voice speaks, e.g. "en-US", "ne-NP". */
  languages: string[];
  gender?: 'male' | 'female' | 'neutral';
  /** Free text such as "medium quality · 60 MB" or "premium". */
  description?: string;
  /** Local voices must be installed before use. */
  installed?: boolean;
};

export type SynthesizeOptions = {
  voiceId: string;
  /** 0.5–2, 1 = natural. */
  speed?: number;
  /** BCP-47 hint for providers that need one (Google). */
  language?: string;
  signal?: AbortSignal;
};

export type SynthesizedSpeech = {
  bytes: Uint8Array;
  mimeType: string;
  /** File extension without the dot. */
  extension: 'wav' | 'mp3' | 'ogg';
};

/** Text-to-speech provider. Implemented by cloud adapters (user-supplied key) and the local Piper engine on desktop. */
export interface TTSProvider {
  readonly id: string;
  readonly label: string;
  listVoices(options?: { signal?: AbortSignal }): Promise<TtsVoice[]>;
  synthesize(text: string, options: SynthesizeOptions): Promise<SynthesizedSpeech>;
}

export interface StockMediaProvider {
  readonly id: string;
  search(
    query: string,
    options: {
      type: Extract<AssetType, 'image' | 'video' | 'music'>;
      page?: number;
      signal?: AbortSignal;
    },
  ): Promise<GeneratedAsset[]>;
}
