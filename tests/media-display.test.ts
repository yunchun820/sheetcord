import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fixtureMarkup } from './fixture';
import { addMediaDisplayFixture, addStickerInteractionFixture } from './media-display-fixture';
import { MediaController } from '../src/media';
import { PickerController } from '../src/picker';
import { AppearanceController } from '../src/appearance';
import { EmojiController } from '../src/emoji';
import { stickerDetails } from '../src/adapter';

const media = new MediaController(); const picker = new PickerController(); const appearance = new AppearanceController();
const root = () => document.querySelector<HTMLElement>('#app-mount')!;
const rows = () => [...document.querySelectorAll<HTMLElement>('li[id^="chat-messages-"]')];
beforeEach(() => { document.body.innerHTML = fixtureMarkup(); addMediaDisplayFixture(); });
afterEach(() => { media.clear(); picker.clear(); appearance.clear(); document.body.replaceChildren(); });

it('collapses mosaic/sticker spacers, labels canvas stickers once and restores original dimensions', () => {
  const before = rows().map(row => row.innerHTML);
  media.sync(rows(), '/channels/100/1000');
  expect(document.querySelectorAll('.sc-media-toggle')).toHaveLength(2);
  expect(document.querySelector('.stickerContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('compact');
  expect(document.querySelector('.mosaicContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('compact');
  expect(document.querySelector('.stickerContainer_fixture')?.textContent).toContain('[스티커: 인사하는 고양이]');
  media.toggle(document.querySelector<HTMLElement>('.stickerAsset_fixture')!);
  expect(document.querySelector('.stickerContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('expanded');
  media.collapseAll();
  expect(document.querySelector('.mosaicContainer_fixture')?.getAttribute('data-sc-media-layout')).toBe('compact');
  media.clear();
  expect(rows().map(row => row.innerHTML)).toEqual(before);
});

it('keeps shared mosaic dimensions while any image remains expanded', () => {
  const mosaic = document.querySelector('.mosaicContainer_fixture')!;
  mosaic.append(mosaic.firstElementChild!.cloneNode(true));
  media.sync(rows(), 'route');
  const targets = mosaic.querySelectorAll<HTMLElement>('[data-sc-media]');
  targets.forEach(target => media.toggle(target));
  media.toggle(targets[0]); expect(mosaic.getAttribute('data-sc-media-layout')).toBe('expanded');
  media.toggle(targets[1]); expect(mosaic.getAttribute('data-sc-media-layout')).toBe('compact');
});

it('collapses offscreen expanded media too when all images are collapsed', () => {
  media.sync(rows(), 'route');
  const row = rows()[0]; const target = row.querySelector<HTMLElement>('[data-sc-media]')!;
  media.toggle(target); row.remove(); media.sync(rows(), 'route');
  media.collapseAll();
  document.querySelector('[data-list-id="chat-messages"]')!.append(row);
  media.sync(rows(), 'route');
  expect(target.dataset.scMedia).toBe('collapsed');
});

it('compacts unnamed nested sticker frames without stripping a caption or reaction container', () => {
  const host = document.querySelector<HTMLElement>('.stickerContainer_fixture')!;
  host.className = 'assetShell_fixture';
  host.innerHTML = '<div class="layer_fixture" style="position:absolute;height:160px"><div class="stickerAsset_fixture" aria-label="쓰담냥이"><canvas></canvas></div></div>';
  const original = host.outerHTML;
  media.sync(rows(), 'route');
  expect(host.dataset.scMediaLayout).toBe('compact');
  expect(host.firstElementChild?.getAttribute('data-sc-media-layout')).toBe('compact');
  host.insertAdjacentHTML('afterbegin', '<p>스티커 설명은 보존합니다.</p>');
  media.sync(rows(), 'route');
  expect(host.hasAttribute('data-sc-media-layout')).toBe(false);
  expect(host.querySelector('p')?.textContent).toBe('스티커 설명은 보존합니다.');
  host.querySelector('p')!.remove(); media.clear();
  expect(host.outerHTML).toBe(original);
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

it('leaves picker category headings intact while labeling native data-type emoji buttons', () => {
  const panel = document.querySelector('#emoji-picker-tab-panel')!;
  panel.insertAdjacentHTML('afterbegin', '<div class="header_fixture" role="button"><img alt="샘플 서버"><span>샘플 서버</span></div>');
  const header = panel.querySelector('.header_fixture')!;
  const original = header.outerHTML;
  picker.sync(root(), false, false);
  expect(header.outerHTML).toBe(original);
  expect(panel.querySelector('[data-type="emoji"]')?.getAttribute('data-sc-picker-label')).toBe('approved');
  picker.clear();
  expect(panel.querySelector('[data-sc-picker-label]')).toBeNull();
});

it('preserves compact media marks in emoji presentation clones', () => {
  const content = document.querySelector('#message-content-83')!;
  content.insertAdjacentHTML('beforeend', '<div class="stickerContainer_fixture" style="height:160px"><canvas aria-label="하트 스티커"></canvas></div>');
  media.sync(rows(), 'route');
  const emoji = new EmojiController(); emoji.sync(rows(), false);
  expect(content.nextElementSibling?.querySelector('[data-sc-media-layout="compact"]')).not.toBeNull();
  emoji.clear();
});

it('identifies stickers inside generic image wrappers and reads parent names without revealing spoilers', () => {
  const row = rows()[0];
  row.querySelector('.accessories_fixture')!.innerHTML = '<button aria-label="춤추는 고양이"><div class="imageWrapper_fixture"><img src="https://media.discordapp.net/stickers/123456789.png" alt="Sticker"></div></button>';
  const target = row.querySelector<HTMLElement>('.imageWrapper_fixture')!;
  const action = target.parentElement!;
  expect(stickerDetails(target)?.name).toBe('춤추는 고양이');
  media.sync(rows(), 'route');
  expect(action.previousElementSibling?.textContent).toBe('+ [스티커: 춤추는 고양이] 펼치기');
  target.parentElement!.setAttribute('aria-label', '인사하는 고양이');
  media.sync(rows(), 'route');
  expect(action.previousElementSibling?.textContent).toBe('+ [스티커: 인사하는 고양이] 펼치기');
  target.classList.add('spoilerContent_fixture'); media.sync(rows(), 'route');
  expect(action.previousElementSibling?.textContent).toBe('+ 스티커 펼치기');
  target.querySelector('img')!.setAttribute('src', 'https://cdn.example.com/photo.png');
  target.querySelector('img')!.setAttribute('alt', '일반 사진');
  expect(stickerDetails(target)).toBeNull();
});

it('marks native Korean/English pinned controls and restores their exact DOM', () => {
  const panel = document.createElement('div');
  panel.innerHTML = '<button aria-label="고정된 메시지" style="background:#5865f2"><svg fill="#5865f2"></svg></button><button>Pinned Messages</button><button>일반 버튼</button>';
  root().append(panel);
  const original = panel.innerHTML;
  appearance.sync(root());
  expect(panel.querySelectorAll('[data-sc-pinned-control]')).toHaveLength(2);
  panel.querySelectorAll('button')[1].textContent = '닫기';
  appearance.sync(root());
  expect(panel.querySelectorAll('[data-sc-pinned-control]')).toHaveLength(1);
  panel.querySelectorAll('button')[1].textContent = 'Pinned Messages';
  appearance.clear(); expect(panel.innerHTML).toBe(original);
});

it('keeps toggle mouse and keyboard events outside native sticker capture handlers', () => {
  document.body.innerHTML = fixtureMarkup();
  const action = addStickerInteractionFixture();
  const original = rows().map(row => row.innerHTML);
  const native = vi.fn();
  for (const type of ['pointerdown', 'mousedown', 'keydown', 'click']) action.addEventListener(type, native, true);
  media.sync(rows(), 'route'); appearance.sync(root());
  expect(action.querySelector('.sc-control-label')).toBeNull();
  const toggle = action.previousElementSibling as HTMLButtonElement;
  expect(toggle.className).toBe('sc-media-toggle');
  for (const type of ['pointerdown', 'mousedown', 'keydown']) toggle.dispatchEvent(new Event(type, { bubbles: true }));
  toggle.click();
  expect(action.dataset.scMedia).toBe('expanded');
  expect(native).not.toHaveBeenCalled();
  expect(root().querySelector('[aria-label="스티커 정보 샘플"]')).toBeNull();
  action.querySelector<HTMLElement>('img')!.click();
  expect(native).toHaveBeenCalledOnce();
  expect(root().querySelector('[aria-label="스티커 정보 샘플"]')).not.toBeNull();
  root().querySelector('[aria-label="스티커 정보 샘플"]')!.remove();
  toggle.click();
  expect(action.dataset.scMedia).toBe('collapsed');
  expect(native).toHaveBeenCalledOnce();
  media.clear(); appearance.clear();
  expect(rows().map(row => row.innerHTML)).toEqual(original);
});
