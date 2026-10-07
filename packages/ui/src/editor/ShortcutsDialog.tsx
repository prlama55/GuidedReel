import { Dialog, Kbd } from '../primitives/index';
import { modKey } from '../lib/format';

const ROWS: [string, string[]][] = [
  ['Play / stop', ['Space']],
  ['Shuttle: slower / pause / faster', ['J', 'K', 'L']],
  ['Split scene at playhead', ['S']],
  ['Move scene earlier / later', ['⌥', '←/→']],
  ['Hold while dragging to skip snapping', ['⌥']],
  ['Step one frame', ['←', '→']],
  ['Step one second', ['⇧', '←/→']],
  ['Go to start', ['Home']],
  ['Go to end', ['End']],
  ['Undo', [modKey, 'Z']],
  ['Redo', ['⇧', modKey, 'Z']],
  ['Duplicate scene', [modKey, 'D']],
  ['Delete scene / overlay', ['⌫']],
  ['Nudge selected overlay', ['↑↓←→']],
  ['Save now', [modKey, 'S']],
  ['Export', [modKey, 'E']],
  ['Deselect / close', ['Esc']],
  ['This list', ['?']],
];

export const ShortcutsDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => (
  <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" size="sm">
    <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
      {ROWS.map(([label, keys]) => (
        <div key={label} className="contents">
          <dt className="text-fg-muted">{label}</dt>
          <dd className="flex gap-1">
            {keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  </Dialog>
);
