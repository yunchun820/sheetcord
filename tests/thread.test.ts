import { afterEach, beforeEach, expect, it } from 'vitest';
import { DiscordAdapter } from '../src/adapter';
import { AppearanceController } from '../src/appearance';
import { EmojiController } from '../src/emoji';
import { MediaController } from '../src/media';
import { MessageGrid } from '../src/messages';
import { fixtureMarkup } from './fixture';
import { addThreadFixture } from './thread-fixture';

const grid = new MessageGrid();
const emoji = new EmojiController();
const media = new MediaController();
beforeEach(() => { document.body.innerHTML = fixtureMarkup(); addThreadFixture(); });
afterEach(() => { emoji.clear(); media.clear(); grid.clear(); document.body.replaceChildren(); document.head.replaceChildren(); });
const rows = () => { const adapter = new DiscordAdapter(); return adapter.rows(adapter.discover()!); };

it('keeps the parent author and timestamp separate from thread transcripts and previews', () => {
  grid.sync(rows(), '/channels/100/1000');
  const row = rows()[0];
  expect(row.querySelector('.sc-row-author')?.textContent).toBe('지윤');
  expect(row.querySelector('.sc-row-time')?.textContent).not.toBe('13:11');
  expect(row.querySelectorAll('[data-sc-thread-card]')).toHaveLength(1);
  expect(row.querySelectorAll('.sc-row-gutter')).toHaveLength(1);
});

it('leaves accessibility transcripts out of emoji and attachment presentation', () => {
  grid.sync(rows(), '/channels/100/1000');
  media.sync(rows(), '/channels/100/1000');
  emoji.sync(rows(), false, new AppearanceController().emojiSources(document.querySelector('#app-mount')!));
  expect(document.querySelector('#thread-transcript')?.hasAttribute('data-sc-emoji-original')).toBe(false);
  expect(document.querySelector('#thread-transcript [data-sc-emoji-proxy], #thread-transcript .sc-media-toggle')).toBeNull();
  const preview = document.querySelector('.threadMessagePreview_thread[data-sc-emoji-proxy]') as HTMLElement;
  expect(preview.textContent).toContain(':thumbsup:');
  preview.click();
  expect(document.querySelector('.threadMessageAccessory_thread')?.getAttribute('data-opened')).toBe('true');
});

it('restores native markup and removes markers when a thread accessory is recycled', () => {
  const card = document.querySelector('.threadMessageAccessory_thread')!;
  const before = card.outerHTML;
  grid.sync(rows(), '/channels/100/1000');
  card.querySelector('.threadName_thread')!.className = 'renamed';
  grid.sync(rows(), '/channels/100/1000');
  expect(card.hasAttribute('data-sc-thread-card')).toBe(false);
  card.querySelector('.renamed')!.className = 'threadName_thread';
  grid.sync(rows(), '/channels/100/1000');
  grid.clear();
  expect(card.outerHTML).toBe(before);
});

it('preserves the worksheet card style when emoji replacement clones the whole accessory', () => {
  grid.sync(rows(), '/channels/100/1000');
  const card = document.querySelector<HTMLElement>('[data-sc-thread-card]')!;
  emoji.sync(rows(), false, [card]);
  const proxy = document.querySelector<HTMLElement>('[data-sc-thread-card][data-sc-emoji-proxy]')!;
  expect(proxy).not.toBeNull();
  proxy.click();
  expect(card.dataset.opened).toBe('true');
  emoji.sync(rows(), true);
  expect(card.hasAttribute('data-sc-emoji-original')).toBe(false);
  expect(document.querySelector('[data-sc-emoji-proxy]')).toBeNull();
});
