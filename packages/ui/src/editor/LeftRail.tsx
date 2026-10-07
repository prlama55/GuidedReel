import {
  Clapperboard,
  FileText,
  FolderOpen,
  LayoutTemplate,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import { useEditorStore, type LeftPanel } from '../store/editor-store';
import { cn } from '../lib/cn';

const ITEMS: { id: LeftPanel; label: string; icon: LucideIcon }[] = [
  { id: 'scenes', label: 'Scenes', icon: Clapperboard },
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'assets', label: 'Assets', icon: FolderOpen },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'brand', label: 'Brand', icon: Palette },
];

export const LeftRail: React.FC = () => {
  const active = useEditorStore((s) => s.leftPanel);
  const setLeftPanel = useEditorStore((s) => s.setLeftPanel);
  return (
    <nav
      className="flex w-14 flex-col items-center gap-1 border-r border-border bg-surface py-2"
      aria-label="Editor panels"
    >
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setLeftPanel(id)}
          aria-pressed={active === id}
          className={cn(
            'flex w-12 flex-col items-center gap-0.5 rounded-md py-2 text-[10px] font-medium transition-colors',
            active === id
              ? 'bg-surface-3 text-fg'
              : 'text-fg-subtle hover:bg-surface-2 hover:text-fg',
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </button>
      ))}
    </nav>
  );
};
