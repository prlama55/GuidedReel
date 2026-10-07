import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  STICKER_CATEGORIES,
  searchStickers,
  type Sticker,
  type StickerCategory,
} from '@guidedreel/engine';
import { Dialog, Input, Switch } from '../primitives/index';
import { cn } from '../lib/cn';

/**
 * Emoji sticker browser. The grid renders the emoji characters themselves
 * (no network); the chosen sticker is added as an overlay that plays the
 * Noto animated version or shows the static vector.
 */
export const StickerPicker: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (sticker: Sticker, animated: boolean) => void;
}> = ({ open, onClose, onPick }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StickerCategory | 'all'>('all');
  const [animated, setAnimated] = useState(true);
  const results = useMemo(
    () => searchStickers(query, category === 'all' ? undefined : category).slice(0, 400),
    [query, category],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a sticker"
      description="Free Noto emoji from Google Fonts. Animated stickers play as GIFs in the video."
      size="lg"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-fg-subtle" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stickers (fire, heart, thumbs…)"
              className="pl-8"
              aria-label="Search stickers"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            Animated{' '}
            <Switch
              checked={animated}
              onCheckedChange={setAnimated}
              aria-label="Animated stickers"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', ...STICKER_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px]',
                category === c
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-fg-muted hover:text-fg',
              )}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
        <div
          role="listbox"
          aria-label="Stickers"
          className="grid max-h-[50vh] grid-cols-8 gap-1 overflow-y-auto rounded-md border border-border bg-surface-2 p-2 sm:grid-cols-10"
        >
          {results.map((s) => (
            <button
              key={s.codepoint}
              type="button"
              role="option"
              aria-selected={false}
              title={s.name}
              aria-label={`Sticker ${s.name}`}
              onClick={() => {
                onPick(s, animated);
                onClose();
              }}
              className="flex aspect-square items-center justify-center rounded-md text-2xl hover:bg-surface-3"
            >
              {s.emoji}
            </button>
          ))}
          {results.length === 0 ? (
            <div className="col-span-full p-6 text-center text-xs text-fg-muted">
              No stickers match “{query}”.
            </div>
          ) : null}
        </div>
        <p className="text-[10px] text-fg-subtle">
          Animated stickers are streamed from fonts.gstatic.com when previewing and rendering. For
          your own GIFs, use “Add media” and pick a .gif file.
        </p>
      </div>
    </Dialog>
  );
};
