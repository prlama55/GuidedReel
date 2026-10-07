import {
  Film,
  Flag,
  Image as ImageIcon,
  MousePointerClick,
  Package,
  Quote,
  Sparkles,
  Star,
  Type,
  Zap,
  type LucideIcon,
  Music,
  Mic,
  FileAudio,
  Type as FontIcon,
  Shapes,
} from 'lucide-react';
import type { AssetType, SceneType } from '@guidedreel/schema';

export const SCENE_ICONS: Record<SceneType, LucideIcon> = {
  intro: Sparkles,
  hook: Zap,
  text: Type,
  image: ImageIcon,
  video: Film,
  feature: Star,
  product: Package,
  quote: Quote,
  cta: MousePointerClick,
  outro: Flag,
};

export const ASSET_ICONS: Record<AssetType, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: FileAudio,
  voiceover: Mic,
  music: Music,
  font: FontIcon,
  logo: Shapes,
};

export const SceneIcon: React.FC<{
  type: SceneType;
  className?: string;
  style?: React.CSSProperties;
}> = ({ type, className, style }) => {
  const Icon = SCENE_ICONS[type] ?? Type;
  return <Icon className={className} style={style} />;
};
