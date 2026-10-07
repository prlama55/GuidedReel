import { describe, expect, it } from 'vitest';
import {
  STICKERS,
  STICKER_CATEGORIES,
  emojiFromCodepoint,
  findSticker,
  notoAnimatedGifUrl,
  notoStaticSvgUrl,
  searchStickers,
} from './stickers';

describe('sticker library', () => {
  it('has a large catalogue with unique codepoints across all categories', () => {
    expect(STICKERS.length).toBeGreaterThan(500);
    expect(new Set(STICKERS.map((s) => s.codepoint)).size).toBe(STICKERS.length);
    for (const c of STICKER_CATEGORIES)
      expect(
        STICKERS.some((s) => s.category === c),
        c,
      ).toBe(true);
  });
  it('derives emoji characters and URLs from codepoints', () => {
    expect(emojiFromCodepoint('1f600')).toBe('😀');
    expect(emojiFromCodepoint('1f44d')).toBe('👍');
    expect(notoAnimatedGifUrl('1f600')).toBe(
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.gif',
    );
    expect(notoStaticSvgUrl('2764_fe0f')).toContain('/2764_fe0f/emoji.svg');
    expect(findSticker('1f600')?.name).toBe('smile');
  });
  it('searches by name and category', () => {
    expect(searchStickers('fire').some((s) => s.emoji === '🔥')).toBe(true);
    expect(
      searchStickers('', 'Animals and nature').every((s) => s.category === 'Animals and nature'),
    ).toBe(true);
  });
});
