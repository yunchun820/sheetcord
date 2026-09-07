import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscordAdapter, selectors } from '../src/adapter';
import { SheetcordController } from '../src/controller';
import { DomPatches } from '../src/dom';
import { EmojiController, emojiText } from '../src/emoji';
import { MediaController } from '../src/media';
import { MessageGrid } from '../src/messages';
import { defaults, sanitizeSettings, chromeSettings, settingsKey, type Settings, type SettingsStore } from '../src/settings';
import { fixtureMarkup, messageMarkup } from './fixture';
import { readFileSync } from 'node:fs';

class MemoryStore implements SettingsStore {
  settings: Settings;
  listeners = new Set<(settings: Settings) => void>();
  writes: unknown[] = [];
  constructor(settings: Partial<Settings> = {}) { this.settings = { ...defaults, ...settings }; }
  async read() { return { ...this.settings }; }
  async write(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    this.writes.push(patch);
    this.listeners.forEach(listener => listener(this.settings));
  }
  subscribe(listener: (settings: Settings) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

let controller: SheetcordController | null = null;
const adapter = new DiscordAdapter();
const surface = () => adapter.discover()!;
const rows = () => adapter.rows(surface());
const wait = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

beforeEach(() => {
  document.body.innerHTML = fixtureMarkup();
  history.replaceState(null, '', '/channels/100/1000');
});
afterEach(() => {
  controller?.destroy();
  controller = null;
  document.body.replaceChildren();
  document.head.replaceChildren();
  for (const attr of [...document.documentElement.attributes]) if (attr.name.startsWith('data-sc-')) document.documentElement.removeAttribute(attr.name);
  vi.unstubAllGlobals();
});

describe('adapter boundary', () => {
  it('discovers existing nodes, server order, selected server and unread state', () => {
    expect(surface().list).not.toBeNull();
    const tabs = adapter.tabs(surface());
    expect(tabs.map(tab => tab.key)).toEqual(['@me', '100', '200', '300', '400', '500']);
    expect(tabs.find(tab => tab.selected)?.key).toBe('100');
    expect(tabs.find(tab => tab.key === '200')?.unread).toBe(true);
    expect(adapter.channelLabel(surface())).toBe('일반');
  });
  it('uses the native composer even when an inline editing textbox appears earlier', () => {
    const composer = surface().editor;
    rows()[0].insertAdjacentHTML('beforeend', '<div role="textbox" contenteditable="true" data-slate-editor="true">inline edit</div>');
    expect(surface().editor).toBe(composer);
  });
  it('supports read-only channels and the DM home without inventing an input', () => {
    document.querySelector('form')!.remove();
    expect(surface().editor).toBeNull();
    history.replaceState(null, '', '/channels/@me');
    expect(adapter.tabs(surface())[0].selected).toBe(true);
  });
  it('fails closed if required navigation is missing', () => {
    document.querySelector('.sidebarList_fixture')!.remove();
    expect(adapter.discover()).toBeNull();
  });
});

describe('presentation controls preserve native data and actions', () => {
  it('collapses images without revealing spoilers and restores the same image nodes', () => {
    const media = new MediaController();
    const targets = [...document.querySelectorAll<HTMLElement>(selectors.attachment)];
    const image = targets[0].querySelector('img');
    const reveal = vi.fn();
    document.querySelector('.spoilerCover_fixture')!.addEventListener('click', reveal);
    media.sync(rows(), location.pathname);
    expect(targets.every(target => target.dataset.scMedia === 'collapsed')).toBe(true);
    media.toggle(targets[0]);
    expect(targets[0].dataset.scMedia).toBe('expanded');
    expect(targets[0].querySelector('img')).toBe(image);
    media.toggle(targets[2]);
    expect(reveal).not.toHaveBeenCalled();
    expect(document.querySelector('.spoilerCover_fixture')).not.toBeNull();
    media.collapseAll();
    expect(targets.every(target => target.dataset.scMedia === 'collapsed')).toBe(true);
    media.clear();
    expect(document.querySelector('[data-sc-media], .sc-media-toggle')).toBeNull();
  });
  it('retains expanded state through virtual-list recycling but resets it on channel change', () => {
    const media = new MediaController();
    media.sync(rows(), location.pathname);
    const row = document.getElementById('chat-messages-1000-2')!;
    const target = row.querySelector<HTMLElement>(selectors.attachment)!;
    media.toggle(target);
    row.remove();
    media.sync(rows(), location.pathname);
    document.querySelector('[data-list-id="chat-messages"]')!.append(row);
    media.sync(rows(), location.pathname);
    expect(target.dataset.scMedia).toBe('expanded');
    media.sync(rows(), '/channels/200/2000');
    expect(target.dataset.scMedia).toBe('collapsed');
    expect(document.querySelectorAll('.sc-media-toggle').length).toBe(3);
    media.clear();
  });
  it('creates readable emoji fallbacks including flags, ZWJ sequences and keycaps', () => {
    expect(emojiText('좋아요 👍')).toBe('좋아요 :thumbsup:');
    const complex = emojiText('🇰🇷 👨‍👩‍👧‍👦 1️⃣');
    expect(complex).not.toContain('🇰🇷');
    expect(complex.match(/\[이모지 /g)?.length).toBe(3);
    expect(emojiText('그냥 글자 123')).toBe('그냥 글자 123');
  });
  it('does not change original Unicode, custom emoji, code, links or React-owned text nodes', () => {
    const source = document.getElementById('message-content-5')!;
    source.insertAdjacentHTML('beforeend', '<code>👍</code> <a href="https://example.com">문서 👍</a>');
    const original = source.innerHTML;
    const originalText = source.firstChild;
    const emoji = new EmojiController();
    emoji.sync(rows(), false);
    expect(source.innerHTML).toBe(original);
    expect(source.firstChild).toBe(originalText);
    const proxy = source.nextElementSibling!;
    expect(proxy.textContent).toContain(':thumbsup:');
    expect(proxy.textContent).toContain(':approved:');
    expect(proxy.querySelector('code')!.textContent).toBe('👍');
    expect(proxy.querySelector('a')!.getAttribute('href')).toBe('https://example.com');
    expect(document.querySelectorAll('#message-content-5').length).toBe(1);
    emoji.sync(rows(), true);
    expect(source.hasAttribute('data-sc-emoji-original')).toBe(false);
    expect(source.innerHTML).toBe(original);
    expect(document.querySelector('[data-sc-emoji-proxy]')).toBeNull();
  });
  it('forwards hidden-emoji reaction clicks exactly once and follows native count changes', () => {
    const source = document.querySelector<HTMLElement>('.reaction_fixture')!;
    const click = vi.fn(() => { source.querySelector('.reactionCount_fixture')!.textContent = '4'; });
    source.addEventListener('click', click);
    const emoji = new EmojiController();
    emoji.sync(rows(), false);
    const proxy = source.nextElementSibling as HTMLElement;
    proxy.querySelector<HTMLElement>('span')!.click();
    expect(click).toHaveBeenCalledTimes(1);
    emoji.sync(rows(), false);
    expect(source.nextElementSibling!.textContent).toContain('4');
    emoji.clear();
    expect(source.querySelector('.reactionCount_fixture')!.textContent).toBe('4');
  });
  it('refreshes edited message proxies and never accumulates duplicate clones', () => {
    const source = document.getElementById('message-content-5')!;
    const emoji = new EmojiController();
    emoji.sync(rows(), false);
    const initialCount = document.querySelectorAll('[data-sc-emoji-proxy]').length;
    source.firstChild!.textContent = '수정했어요 🔥';
    for (let i = 0; i < 8; i++) emoji.sync(rows(), false);
    expect(source.nextElementSibling!.textContent).toContain('수정했어요 :fire:');
    expect(document.querySelectorAll('[data-sc-emoji-proxy]').length).toBe(initialCount);
    emoji.clear();
  });
  it('never proxies a native inline editor', () => {
    const source = document.getElementById('message-content-5')!;
    source.setAttribute('contenteditable', 'true');
    const original = source.firstChild;
    const emoji = new EmojiController();
    emoji.sync(rows(), false);
    expect(source.hasAttribute('data-sc-emoji-original')).toBe(false);
    expect(source.firstChild).toBe(original);
    emoji.clear();
  });
  it('refreshes reaction pressed state even when its count stays the same', () => {
    const source = document.querySelector<HTMLElement>('.reaction_fixture')!;
    const emoji = new EmojiController();
    emoji.sync(rows(), false);
    source.setAttribute('aria-pressed', 'true');
    emoji.sync(rows(), false);
    expect(source.nextElementSibling!.getAttribute('aria-pressed')).toBe('true');
    emoji.clear();
  });
  it('keeps local row references stable when history is prepended', () => {
    const grid = new MessageGrid();
    grid.sync(rows(), location.pathname);
    const reference = rows()[0].querySelector('.sc-row-number')!.textContent;
    surface().list!.insertAdjacentHTML('afterbegin', messageMarkup(99, '예전 작성자', '지난 메시지'));
    grid.sync(rows(), location.pathname);
    expect(document.getElementById('chat-messages-1000-1')!.querySelector('.sc-row-number')!.textContent).toBe(reference);
    expect(document.getElementById('chat-messages-1000-6')!.querySelector('.sc-row-author')!.textContent).toBe('지윤');
    grid.clear();
    expect(document.querySelector('.sc-row-gutter, [data-sc-row]')).toBeNull();
  });
});

describe('extension lifecycle', () => {
  it('uses only storage permissions, a local script and Discord chat match patterns', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.content_scripts[0].matches).toEqual(['https://discord.com/channels/*']);
    expect(manifest.content_scripts[0].world).toBe('ISOLATED');
    expect(manifest.host_permissions).toBeUndefined();
  });
  it('restores the exact native subtree and leaves its listeners, draft and IME events intact', async () => {
    const native = document.getElementById('app-mount')!;
    const input = surface().editor!;
    input.textContent = '아직 작성 중인 한글';
    const draftNode = input.firstChild;
    const snapshot = native.innerHTML;
    const inputEvent = vi.fn();
    input.addEventListener('keydown', inputEvent);
    const store = new MemoryStore({ showEmoji: false });
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(document.querySelector('.sc-header')).not.toBeNull());
    expect(surface().editor).toBe(input);
    expect(input.firstChild).toBe(draftNode);
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true });
    input.dispatchEvent(composingEnter);
    expect(inputEvent).toHaveBeenCalledTimes(1);
    expect(composingEnter.defaultPrevented).toBe(false);
    const multiline = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true });
    input.dispatchEvent(multiline);
    expect(multiline.defaultPrevented).toBe(false);
    await store.write({ enabled: false });
    expect(native.innerHTML).toBe(snapshot);
    expect(input.firstChild).toBe(draftNode);
    expect(document.querySelector('[data-sc-owned], [data-sc-active]')).toBeNull();
    surface().list!.insertAdjacentHTML('beforeend', messageMarkup(90, '새 작성자', '비활성 메시지'));
    await wait();
    expect(document.querySelector('[data-sc-row]')).toBeNull();
  });
  it('decorates newly received messages once, handles channel changes and toggles sidebar', async () => {
    const store = new MemoryStore();
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(document.querySelectorAll('.sc-row-gutter').length).toBe(12));
    surface().list!.insertAdjacentHTML('beforeend', messageMarkup(91, '새 작성자', '추가된 메시지 👍', { image: true }));
    await vi.waitFor(() => expect(document.querySelectorAll('.sc-row-gutter').length).toBe(13));
    expect(document.getElementById('chat-messages-1000-91')!.querySelectorAll('.sc-media-toggle').length).toBe(1);
    history.pushState(null, '', '/channels/200/2000');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await vi.waitFor(() => expect(document.querySelector('[data-sc-tab="200"]')!.getAttribute('aria-selected')).toBe('true'));
    await store.write({ sidebarCollapsed: true });
    await vi.waitFor(() => expect(document.documentElement.dataset.scSidebarCollapsed).toBe('true'));
  });
  it('forwards server-tab selection to its latest source node', async () => {
    controller = new SheetcordController(new MemoryStore());
    await controller.start();
    await vi.waitFor(() => expect(document.querySelector('[data-sc-tab="200"]')).not.toBeNull());
    const source = document.querySelector<HTMLElement>('[data-list-item-id="guildsnav___200"]')!;
    const replacement = source.cloneNode(true) as HTMLElement;
    const click = vi.fn();
    replacement.addEventListener('click', click);
    source.replaceWith(replacement);
    await wait();
    document.querySelector<HTMLElement>('[data-sc-tab="200"]')!.click();
    expect(click).toHaveBeenCalledTimes(1);
  });
  it('restores after a structural mismatch and can retry without reloading', async () => {
    controller = new SheetcordController(new MemoryStore());
    await controller.start();
    await vi.waitFor(() => expect(document.querySelector('.sc-header')).not.toBeNull());
    document.querySelector('.sidebarList_fixture')!.className = 'changed-sidebar';
    document.querySelector('.changed-sidebar')!.setAttribute('aria-label', '알 수 없는 탐색');
    await vi.waitFor(() => expect(document.querySelector('.sc-header')).toBeNull(), { timeout: 3500 });
    expect(document.documentElement.hasAttribute('data-sc-active')).toBe(false);
    expect(document.querySelector('[role="status"]')!.textContent).toContain('원래 화면');
    document.querySelector('.changed-sidebar')!.className = 'sidebarList_fixture';
    document.querySelector('.sidebarList_fixture')!.setAttribute('aria-label', '채널');
    controller.retry();
    await vi.waitFor(() => expect(document.querySelector('.sc-header')).not.toBeNull());
  });
  it('keeps persisted settings across remount and can re-enable after a full teardown', async () => {
    const store = new MemoryStore({ enabled: false, showEmoji: false, sidebarCollapsed: true });
    controller = new SheetcordController(store);
    await controller.start();
    expect(document.querySelector('.sc-header')).toBeNull();
    await store.write({ enabled: true });
    await vi.waitFor(() => expect(document.querySelector('[data-sc-emoji-proxy]')).not.toBeNull());
    controller.destroy();
    expect(store.listeners.size).toBe(0);
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(document.documentElement.dataset.scSidebarCollapsed).toBe('true'));
  });
  it('does not overwrite a concurrent native attribute change during restoration', () => {
    const element = document.createElement('div');
    element.setAttribute('data-example', 'before');
    const patches = new DomPatches();
    patches.set(element, 'data-example', 'applied');
    element.setAttribute('data-example', 'changed by page');
    patches.restore();
    expect(element.getAttribute('data-example')).toBe('changed by page');
  });
});

describe('settings privacy and recovery', () => {
  it('discards unknown fields and invalid values', () => {
    expect(sanitizeSettings({ enabled: false, showEmoji: 'false', sidebarCollapsed: 1, token: 'must-not-persist' }))
      .toEqual({ enabled: false, showEmoji: true, sidebarCollapsed: false });
    expect(sanitizeSettings(null)).toEqual(defaults);
  });
  it('persists only the three display settings through chrome.storage.local', async () => {
    const set = vi.fn(async () => {});
    const get = vi.fn(async () => ({ [settingsKey]: { ...defaults, unknown: 'discard' } }));
    vi.stubGlobal('chrome', { storage: { local: { get, set } } });
    await chromeSettings().write({ showEmoji: false });
    expect(set).toHaveBeenCalledWith({ [settingsKey]: { ...defaults, showEmoji: false } });
  });
});
