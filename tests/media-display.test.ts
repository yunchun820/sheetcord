import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fixtureMarkup } from './fixture';
import { addMediaDisplayFixture } from './media-display-fixture';
import { MediaController } from '../src/media';
import { PickerController } from '../src/picker';
import { AppearanceController } from '../src/appearance';
import { EmojiController } from '../src/emoji';

const media = new MediaController(); const picker = new PickerController(); const appearance = new AppearanceController();
const root = () => document.querySelector<HTMLElement>('#app-mount')!;
const rows = () => [...document.querySelectorAll<HTMLElement>('li[id^="chat-messages-"]')];
beforeEach(() => { document.body.innerHTML = fixtureMarkup(); addMediaDisplayFixture(); });
afterEach(() => { media.clear(); picker.clear(); appearance.clear(); document.body.replaceChildren(); });

it('collapses mosaic/sticker spacers, labels canvas stickers once and restores original dimensions', () => {
  const before = rows().map(row => row.innerHTML);
  media.sync(rows(), '/channels/100/1000', false);
  expect(document.querySelectorAll('.sc-media-toggle')).toHaveLength(2);
  expect(document.querySelector('.stickerContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('compact');
  expect(document.querySelector('.mosaicContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('compact');
  expect(document.querySelector('.stickerContainer_fixture')?.textContent).toContain('[스티커: 인사하는 고양이]');
  media.sync(rows(), '/channels/100/1000', true);
  expect(document.querySelector('.stickerContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('expanded');
  media.collapseAll();
  expect(document.querySelector('.mosaicContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('compact');
  media.clear();
  expect(rows().map(row => row.innerHTML)).toEqual(before);
});

it('keeps shared mosaic dimensions while any image remains expanded', () => {
  const mosaic = document.querySelector('.mosaicContainer_fixture')!;
  mosaic.append(mosaic.firstElementChild!.cloneNode(true));
  media.sync(rows(), 'route', true);
  const targets = mosaic.querySelectorAll<HTMLElement>('[data-sc-media]');
  media.toggle(targets[0]); expect(mosaic.getAttribute('data-sc-media-layout')).toBe('expanded');
  media.toggle(targets[1]); expect(mosaic.getAttribute('data-sc-media-layout')).toBe('compact');
});

it('relabels recycled choices, preserves native click/disabled behavior and restores independently', () => {
  const original = root().innerHTML;
  const sticker = document.querySelector<HTMLButtonElement>('#sticker-picker-tab-panel button')!;
  const selected = vi.fn(); sticker.addEventListener('click', selected);
  picker.sync(root(), false, false); appearance.sync(root());
  expect(document.querySelectorAll('[data-sc-picker-label]')).toHaveLength(4);
  expect(sticker.querySelector('.sc-control-label')).toBeNull();
  sticker.click(); expect(selected).toHaveBeenCalledOnce();
  const disabled = document.querySelector<HTMLButtonElement>('button[disabled]')!;
  const unavailable = vi.fn(); disabled.addEventListener('click', unavailable); disabled.click();
  expect(unavailable).not.toHaveBeenCalled();
  sticker.setAttribute('aria-label', '새 스티커'); picker.sync(root(), false, false);
  expect(sticker.dataset.scPickerLabel).toBe('새 스티커');
  picker.sync(root(), true, false);
  expect(document.querySelectorAll('[data-sc-picker-label]')).toHaveLength(1);
  picker.sync(root(), true, true);
  expect(document.querySelector('[data-sc-picker-label]')).toBeNull();
  sticker.setAttribute('aria-label', '인사하는 고양이');
  document.querySelector('[role="status"]')!.textContent = '선택 없음';
  appearance.clear(); expect(root().innerHTML).toBe(original);
});

it('reads referenced names and late alt-only choices without exposing media URLs', () => {
  const choices = document.querySelector('#gif-picker-tab-panel')!;
  choices.insertAdjacentHTML('beforeend', '<span id="gif-name">행복한 춤</span><div class="result_fixture" role="button" aria-labelledby="gif-name"><video></video></div><div class="result_fixture" role="button"><img src="https://example.com/private?token=secret"></div>');
  picker.sync(root(), false, true);
  const labels = [...choices.querySelectorAll<HTMLElement>('[data-sc-picker-label]')].map(item => item.dataset.scPickerLabel);
  expect(labels).toContain('행복한 춤'); expect(labels).toContain('GIF (이름 없음)');
  expect(labels.join(' ')).not.toContain('secret');
  choices.remove(); picker.sync(root(), true, true);
  expect(choices.querySelector('[data-sc-picker-label]')).toBeNull();
});

it('preserves compact media marks in emoji presentation clones', () => {
  const content = document.querySelector('#message-content-83')!;
  content.insertAdjacentHTML('beforeend', '<div class="stickerContainer_fixture" style="height:160px"><canvas aria-label="하트 스티커"></canvas></div>');
  media.sync(rows(), 'route', false);
  const emoji = new EmojiController(); emoji.sync(rows(), false);
  expect(content.nextElementSibling?.querySelector('[data-sc-media-layout="compact"]')).not.toBeNull();
  emoji.clear();
});
