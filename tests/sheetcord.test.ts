import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscordAdapter, selectors } from '../src/adapter';
import { AppearanceController } from '../src/appearance';
import { SheetcordController } from '../src/controller';
import { DomPatches } from '../src/dom';
import { EmojiController, emojiText } from '../src/emoji';
import { MediaController } from '../src/media';
import { MessageGrid } from '../src/messages';
import { defaults, sanitizeSettings, chromeSettings, settingsKey, type Settings, type SettingsStore } from '../src/settings';
import { fixtureMarkup, messageMarkup } from './fixture';
import { addDarkSidebarFixture } from './sidebar-fixture';
import { addMessageParityFixture } from './message-parity-fixture';
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
  it('keeps channel shortcuts usable with the sidebar collapsed and a replaced native link', async () => {
    controller = new SheetcordController(new MemoryStore({ sidebarCollapsed: true }));
    await controller.start();
    await wait();
    const list = document.querySelector('.sc-channel-list')!;
    const button = list.querySelector<HTMLButtonElement>('[aria-current="page"]')!;
    expect(button.textContent).toBe('일반');
    const original = surface().sidebar.querySelector<HTMLAnchorElement>('a[href="/channels/100/1000"]')!;
    const replacement = original.cloneNode(true) as HTMLAnchorElement;
    const clicked = vi.fn((event: Event) => event.preventDefault());
    replacement.addEventListener('click', clicked);
    original.replaceWith(replacement);
    await wait();
    expect(list.querySelector('[aria-current="page"]')).toBe(button);
    button.click();
    expect(clicked).toHaveBeenCalledTimes(1);
  });
  it('skips emoji discovery while enabled and resumes it when hidden', async () => {
    const scan = vi.spyOn(AppearanceController.prototype, 'emojiSources');
    try {
      const store = new MemoryStore({ showEmoji: true });
      controller = new SheetcordController(store);
      await controller.start();
      await wait();
      expect(scan).not.toHaveBeenCalled();
      await store.write({ showEmoji: false });
      await wait();
      expect(scan).toHaveBeenCalled();
      expect(document.querySelector('[data-sc-emoji-proxy]')).not.toBeNull();
    } finally { scan.mockRestore(); }
  });
  it('finds consecutive emoji text sources without querying ordinary subtrees', () => {
    const root = document.createElement('section');
    root.innerHTML = '<div id="ordinary"><span>plain text</span></div><p>😀</p><p>😀</p><div contenteditable="true">😀</div><div data-sc-owned>😀</div><div>😀<input></div>';
    const ordinary = root.querySelector('#ordinary')!;
    const query = vi.spyOn(ordinary, 'querySelector');
    const sources = new AppearanceController().emojiSources(root);
    expect(sources).toEqual([...root.querySelectorAll('p')]);
    expect(query).not.toHaveBeenCalled();
    query.mockRestore();
  });
  it('discovers the quest page without a chat composer or a main landmark', () => {
    const main = surface().chat;
    main.replaceWith(Object.assign(document.createElement('div'), { className: 'page_fixture', innerHTML: '<section class="contentSection_fixture"><article class="questTile_fixture">퀘스트</article></section>' }));
    history.replaceState(null, '', '/quest-home');
    expect(surface().chat.className).toBe('page_fixture');
    expect(surface().form).toBeNull();
  });
  it('does not assign message gutters to native date separators', () => {
    const count = rows().length;
    surface().list!.insertAdjacentHTML('beforeend', '<div role="separator" class="divider_fixture" data-list-item-id="chat-messages___divider-today">오늘</div>');
    expect(rows()).toHaveLength(count);
  });
  it('uses the server name without unread hints or decorative initials', () => {
    const item = document.querySelector('[data-list-item-id="guildsnav___100"]')!;
    item.removeAttribute('aria-label');
    item.innerHTML = '<span class="hiddenVisually_fixture">읽지 않은 메시지</span><span class="hiddenVisually_fixture">test</span><div aria-hidden="true">t</div>';
    expect(adapter.tabs(surface()).find(tab => tab.key === '100')?.label).toBe('test');
  });
  it('includes a separate sidebar account panel without capturing chat or guild navigation', () => {
    addDarkSidebarFixture();
    const found = surface();
    expect(found.sidebar.classList.contains('sidebar_fixture')).toBe(true);
    expect(found.sidebar.querySelector('.panels_fixture')).not.toBeNull();
    expect(found.sidebar.contains(found.chat)).toBe(false);
    expect(found.sidebar.contains(found.guilds)).toBe(false);
  });
  it('does not theme the whole app if a sidebar-named ancestor also contains chat', () => {
    document.querySelector('.native-layout')!.classList.add('sidebar_misleading');
    expect(surface().sidebar.classList.contains('sidebarList_fixture')).toBe(true);
  });
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
  it('ignores visually blank labels and resolves referenced server names', () => {
    const source = document.querySelector<HTMLElement>('[data-list-item-id="guildsnav___100"]')!;
    source.setAttribute('aria-label', ' \u200B\uFEFF ');
    source.setAttribute('title', '제목에서 찾은 서버 이름');
    expect(adapter.tabs(surface()).find(tab => tab.key === '100')!.label).toBe('제목에서 찾은 서버 이름');
    const label = document.createElement('span');
    label.id = ':guild:name:100';
    label.hidden = true;
    label.textContent = '  이름표로 연결된 서버 🌿  ';
    document.body.append(label);
    source.setAttribute('aria-labelledby', 'missing-id :guild:name:100');
    expect(adapter.tabs(surface()).find(tab => tab.key === '100')!.label).toBe('이름표로 연결된 서버 🌿');
  });
  it('reads nested icon labels and image alt text instead of producing empty sheets', () => {
    const source = document.querySelector<HTMLElement>('[data-list-item-id="guildsnav___200"]')!;
    source.setAttribute('aria-label', ' \u200B ');
    source.innerHTML = '<span role="img" aria-label="아이콘에 이름이 있는 서버"></span>';
    expect(adapter.tabs(surface()).find(tab => tab.key === '200')!.label).toBe('아이콘에 이름이 있는 서버');
    source.innerHTML = '<img alt="이미지 설명에 있는 서버 이름">';
    expect(adapter.tabs(surface()).find(tab => tab.key === '200')!.label).toBe('이미지 설명에 있는 서버 이름');
  });
  it('provides identifiable fallback text and preserves complete long names and ZWJ emoji', () => {
    const source = document.querySelector<HTMLElement>('[data-list-item-id="guildsnav___300"]')!;
    source.setAttribute('aria-label', ' \u200B\u2060 ');
    source.textContent = '\uFEFF';
    expect(adapter.tabs(surface()).find(tab => tab.key === '300')!.label).toBe('서버 (300)');
    const longName = '👨‍👩‍👧‍👦 아주 긴 서버 이름 · ' + '함께 읽고 이야기하는 사람들 '.repeat(4).trim();
    source.setAttribute('aria-label', longName);
    expect(adapter.tabs(surface()).find(tab => tab.key === '300')!.label).toBe(longName);
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
  it('marks the native author target and restores recycled rows without changing handlers', () => {
    const row = rows()[0];
    const author = row.querySelector<HTMLElement>('[role="button"][class*="username_"]')!;
    const parent = author.parentElement;
    const click = vi.fn();
    author.addEventListener('click', click);
    const grid = new MessageGrid();
    grid.sync([row], location.pathname);
    grid.sync([row], location.pathname);
    expect(author.hasAttribute('data-sc-author-control')).toBe(true);
    expect(author.parentElement).toBe(parent);
    author.click();
    expect(click).toHaveBeenCalledTimes(1);
    grid.sync([], location.pathname);
    expect(author.hasAttribute('data-sc-author-control')).toBe(false);
    grid.sync([row], location.pathname);
    grid.clear();
    expect(author.hasAttribute('data-sc-author-control')).toBe(false);
    expect(author.parentElement).toBe(parent);
  });
  it('labels a forum prefix control from its visible icon without replacing its action', () => {
    const root = document.getElementById('app-mount')!;
    root.insertAdjacentHTML('beforeend', '<div data-sc-form><div class="prefixElement_native"><div role="button" class="iconLayout_native" aria-hidden="false"><svg aria-label="검색하기" aria-hidden="true"></svg><svg aria-label="지우기" aria-hidden="false"></svg></div></div></div>');
    const control = root.querySelector<HTMLElement>('.iconLayout_native')!;
    const original = control.innerHTML;
    const action = vi.fn();
    control.addEventListener('click', action);
    const appearance = new AppearanceController();
    appearance.sync(root);
    appearance.sync(root);
    expect(control.querySelectorAll('.sc-control-label')).toHaveLength(1);
    expect(control.textContent).toBe('지우기');
    control.click();
    expect(action).toHaveBeenCalledTimes(1);
    appearance.clear();
    expect(control.innerHTML).toBe(original);
    expect(control.hasAttribute('data-sc-text-control')).toBe(false);
  });
  it('preserves clickable image previews and removes labels when media hydrates', () => {
    const root = document.getElementById('app-mount')!;
    const appearance = new AppearanceController();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div role="button" aria-label="이미지"><img src="preview.png"></div>';
    root.append(wrapper);
    const control = wrapper.firstElementChild as HTMLElement;
    const image = control.firstElementChild;
    const click = vi.fn();
    control.addEventListener('click', click);
    appearance.sync(root);
    expect(control.hasAttribute('data-sc-text-control')).toBe(true);
    wrapper.className = 'imageWrapper_native';
    appearance.sync(root);
    appearance.sync(root);
    expect(control.hasAttribute('data-sc-text-control')).toBe(false);
    expect(control.querySelector('.sc-control-label')).toBeNull();
    expect(control.firstElementChild).toBe(image);
    control.click();
    expect(click).toHaveBeenCalledTimes(1);
    appearance.clear();
  });
  it('places one compact time below the last message of each minute, ignoring seconds', () => {
    const selected = rows().slice(0, 3);
    ['2026-09-07T00:31:01Z', '2026-09-07T00:31:59Z', '2026-09-07T00:32:00Z'].forEach((value, i) => selected[i].querySelector('time')!.setAttribute('datetime', value));
    const grid = new MessageGrid();
    grid.sync(selected, location.pathname);
    expect(selected.map(row => (row.querySelector('.sc-compact-time') as HTMLElement).hidden)).toEqual([true, false, false]);
    expect(selected[1].lastElementChild?.className).toBe('sc-compact-time');
    expect(selected[1].lastElementChild?.textContent).toMatch(/\d{2}:31$/);
    expect(selected[0].querySelector('.sc-row-time')!.textContent).toMatch(/\d{2}:31$/);
    grid.clear();
    expect(document.querySelector('.sc-compact-time')).toBeNull();
  });
  it('moves minute labels correctly after new messages, removal and history prepends', () => {
    const list = surface().list!;
    const first = rows()[0];
    first.querySelector('time')!.setAttribute('datetime', '2026-09-07T00:31:01Z');
    const grid = new MessageGrid();
    grid.sync([first], location.pathname);
    expect((first.lastElementChild as HTMLElement).hidden).toBe(false);
    list.insertAdjacentHTML('beforeend', messageMarkup(99, '작성자', '같은 분'));
    const incoming = document.getElementById('chat-messages-1000-99')!;
    incoming.querySelector('time')!.setAttribute('datetime', '2026-09-07T00:31:50Z');
    grid.sync([first, incoming], location.pathname);
    expect((first.lastElementChild as HTMLElement).hidden).toBe(true);
    expect((incoming.lastElementChild as HTMLElement).hidden).toBe(false);
    incoming.remove();
    grid.sync([first], location.pathname);
    expect((first.lastElementChild as HTMLElement).hidden).toBe(false);
    expect(incoming.querySelector('.sc-compact-time')).toBeNull();
    list.prepend(incoming);
    incoming.querySelector('time')!.setAttribute('datetime', '2026-09-07T00:30:50Z');
    grid.sync([incoming, first], location.pathname);
    expect(document.querySelectorAll('.sc-compact-time:not([hidden])').length).toBe(2);
    grid.sync([incoming, first], '/channels/200/2000');
    expect(document.querySelectorAll('.sc-compact-time').length).toBe(2);
    grid.clear();
  });
  it('distinguishes the same clock minute on different dates and handles missing times', () => {
    const selected = rows().slice(0, 4);
    selected[0].querySelector('time')!.setAttribute('datetime', '2026-09-07T00:31:00Z');
    selected[1].querySelector('time')!.setAttribute('datetime', '2026-09-08T00:31:00Z');
    selected[2].querySelector('time')!.remove();
    selected[3].querySelector('time')!.setAttribute('datetime', 'invalid');
    const grid = new MessageGrid();
    grid.sync(selected, location.pathname);
    expect(selected.map(row => (row.lastElementChild as HTMLElement).hidden)).toEqual([false, true, false, false]);
    grid.clear();
  });
  it('hides all media while off, preserves individual choices and excludes avatars and emoji', () => {
    const media = new MediaController();
    const target = document.querySelector<HTMLElement>(selectors.attachment)!;
    media.sync(rows(), location.pathname, false);
    expect(document.querySelectorAll('[data-sc-media="hidden"]').length).toBe(3);
    expect(document.querySelector('.avatar_fixture')!.hasAttribute('data-sc-media')).toBe(false);
    expect(document.querySelector('img.emoji')!.hasAttribute('data-sc-media')).toBe(false);
    media.toggle(target);
    expect(target.dataset.scMedia).toBe('hidden');
    expect((target.previousElementSibling as HTMLButtonElement).disabled).toBe(true);
    media.sync(rows(), location.pathname, true);
    expect(target.dataset.scMedia).toBe('expanded');
    media.toggle(target);
    media.sync(rows(), location.pathname, false);
    media.sync(rows(), location.pathname, true);
    expect(target.dataset.scMedia).toBe('collapsed');
    media.clear();
  });
  it('covers GIF, sticker and embed thumbnail leaves added while images are off', () => {
    rows()[0].insertAdjacentHTML('beforeend', '<video class="gif_fixture"></video><img class="sticker_fixture" src="data:image/gif;base64,R0lGODlh"><div class="embedThumbnail_fixture"><img src="data:image/gif;base64,R0lGODlh"></div>');
    const media = new MediaController();
    media.sync(rows(), location.pathname, false);
    expect(document.querySelectorAll('[data-sc-media="hidden"]').length).toBe(6);
    media.sync(rows(), location.pathname, true);
    expect(document.querySelectorAll('[data-sc-media="expanded"]').length).toBe(6);
    media.clear();
  });
  it('collapses images without revealing spoilers and restores the same image nodes', () => {
    const media = new MediaController();
    const targets = [...document.querySelectorAll<HTMLElement>(selectors.attachment)];
    const image = targets[0].querySelector('img');
    const reveal = vi.fn();
    document.querySelector('.spoilerCover_fixture')!.addEventListener('click', reveal);
    media.sync(rows(), location.pathname, true);
    expect(targets.every(target => target.dataset.scMedia === 'expanded')).toBe(true);
    media.toggle(targets[0]);
    expect(targets[0].dataset.scMedia).toBe('collapsed');
    expect(targets[0].querySelector('img')).toBe(image);
    media.toggle(targets[2]);
    expect(reveal).not.toHaveBeenCalled();
    expect(document.querySelector('.spoilerCover_fixture')).not.toBeNull();
    media.collapseAll();
    expect(targets.every(target => target.dataset.scMedia === 'collapsed')).toBe(true);
    media.clear();
    expect(document.querySelector('[data-sc-media], .sc-media-toggle')).toBeNull();
  });
  it('retains collapsed state through virtual-list recycling but resets it on channel change', () => {
    const media = new MediaController();
    media.sync(rows(), location.pathname, true);
    const row = document.getElementById('chat-messages-1000-2')!;
    const target = row.querySelector<HTMLElement>(selectors.attachment)!;
    media.toggle(target);
    row.remove();
    media.sync(rows(), location.pathname, true);
    document.querySelector('[data-list-id="chat-messages"]')!.append(row);
    media.sync(rows(), location.pathname, true);
    expect(target.dataset.scMedia).toBe('collapsed');
    media.sync(rows(), '/channels/200/2000', true);
    expect(target.dataset.scMedia).toBe('expanded');
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
    expect(proxy.querySelector('code')!.textContent).toBe(':thumbsup:');
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
  it('applies the stored tab name and restores both tab name and favicon on disable', async () => {
    document.head.insertAdjacentHTML('beforeend', '<title>Discord 원래 이름</title><link rel="icon" href="/discord.ico">');
    const store = new MemoryStore({ tabTitle: '주간 보고.xlsx' });
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(document.title).toBe('주간 보고.xlsx'));
    expect(document.querySelector('link[rel="icon"]')!.getAttribute('href')).toMatch(/^data:/);
    await store.write({ tabTitle: '자료 정리' });
    await vi.waitFor(() => expect(document.title).toBe('자료 정리'));
    await store.write({ enabled: false });
    expect(document.title).toBe('Discord 원래 이름');
    expect(document.querySelector('link[rel="icon"]')!.getAttribute('href')).toBe('/discord.ico');
    await store.write({ enabled: true });
    await vi.waitFor(() => expect(document.title).toBe('자료 정리'));
  });
  it('covers late profile/status/embedded emoji and restores native controls on disable', async () => {
    const store = new MemoryStore({ showEmoji: false });
    controller = new SheetcordController(store);
    await controller.start();
    await wait();
    const root = document.querySelector('#app-mount')!;
    root.insertAdjacentHTML('beforeend', '<div role="dialog" class="theme-dark"><span class="status_fixture">상태 👍</span><button aria-label="설정 닫기"><svg></svg></button><input value="초안 👍"><div contenteditable="true">작성 중 👍</div></div>');
    const dialog = root.querySelector('[role="dialog"]')!;
    const original = dialog.innerHTML;
    const close = dialog.querySelector('button')!;
    const click = vi.fn(); close.addEventListener('click', click);
    await wait();
    expect(dialog.querySelector('[data-sc-emoji-proxy]')?.textContent).toBe('상태 :thumbsup:');
    expect(dialog.querySelector('.sc-control-label')?.textContent).toBe('설정 닫기');
    (dialog.querySelector('.sc-control-label') as HTMLElement).click();
    expect(click).toHaveBeenCalledTimes(1);
    expect(dialog.querySelector('[contenteditable]')?.textContent).toBe('작성 중 👍');
    expect(document.documentElement.dataset.scShowImages).toBe('false');
    expect(document.documentElement.dataset.scShowEmoji).toBe('false');
    await store.write({ enabled: false });
    expect(dialog.innerHTML).toBe(original);
  });
  it('keeps the workbook active on a shop SPA route with native navigation', async () => {
    const store = new MemoryStore();
    controller = new SheetcordController(store);
    await controller.start(); await wait();
    history.pushState(null, '', '/shop');
    window.dispatchEvent(new PopStateEvent('popstate')); await wait();
    expect(document.documentElement.hasAttribute('data-sc-active')).toBe(true);
    expect(document.querySelector('.sc-header')).not.toBeNull();
  });
  it('opens help with focus, restores it on Escape and removes outside listeners on teardown', async () => {
    const store = new MemoryStore();
    controller = new SheetcordController(store);
    await controller.start(); await wait();
    const opener = document.querySelector<HTMLButtonElement>('.sc-help-link')!;
    opener.click();
    const panel = document.querySelector<HTMLElement>('.sc-help-panel')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.contains(document.activeElement)).toBe(true);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.sc-help-panel')).toBeNull();
    expect(document.activeElement).toBe(opener);
    opener.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.querySelector('.sc-help-panel')).toBeNull();
    expect(opener.getAttribute('aria-expanded')).toBe('false');
    opener.click();
    await store.write({ enabled: false });
    expect(document.querySelector('.sc-help-panel')).toBeNull();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.querySelector('.sc-header')).toBeNull();
  });
  it('hides ordinary video attachments, not just GIF videos', () => {
    rows()[0].insertAdjacentHTML('beforeend', '<video controls src="movie.mp4"></video>');
    const media = new MediaController(); media.sync(rows(), '/channels/100/1000', false);
    expect(rows()[0].querySelector('video')?.getAttribute('data-sc-media')).toBe('hidden');
    const video = rows()[0].querySelector('video')!;
    const toggle = video.previousElementSibling as HTMLButtonElement;
    expect(toggle.textContent).toBe('영상 숨김');
    media.sync(rows(), '/channels/100/1000', true);
    expect(toggle.textContent).toBe('− 영상 접기');
    media.toggle(video);
    expect(toggle.textContent).toBe('+ 영상 펼치기');
    media.sync(rows(), '/channels/100/1000', false);
    media.sync(rows(), '/channels/100/1000', true);
    expect(toggle.textContent).toBe('+ 영상 펼치기');
    media.clear();
    expect(rows()[0].querySelector('video')?.hasAttribute('data-sc-media')).toBe(false);
  });
  it('keeps inline images governed by the image switch even inside emoji fallback content', async () => {
    const source = document.getElementById('message-content-5')!;
    source.insertAdjacentHTML('beforeend', '<img class="inline-picture" src="data:image/gif;base64,R0lGODlh">');
    const store = new MemoryStore({ showEmoji: false, showImages: true });
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(source.nextElementSibling?.querySelector('.inline-picture')?.getAttribute('data-sc-media')).toBe('expanded'));
    source.nextElementSibling!.querySelector<HTMLButtonElement>('.sc-media-toggle')!.click();
    await vi.waitFor(() => expect(source.nextElementSibling?.querySelector('.inline-picture')?.getAttribute('data-sc-media')).toBe('collapsed'));
    await store.write({ showImages: false });
    await vi.waitFor(() => expect(source.nextElementSibling?.querySelector('.inline-picture')?.getAttribute('data-sc-media')).toBe('hidden'));
    expect(source.nextElementSibling!.querySelector<HTMLButtonElement>('.sc-media-toggle')!.disabled).toBe(true);
  });
  it('switches all three independently, preserves native avatars, and restores settings on remount', async () => {
    const native = document.getElementById('app-mount')!;
    const avatar = document.querySelector<HTMLElement>('.avatar_fixture')!;
    const onClick = vi.fn();
    avatar.addEventListener('click', onClick);
    const snapshot = native.innerHTML;
    const store = new MemoryStore();
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(avatar.hasAttribute('data-sc-message-avatar')).toBe(true));
    for (const showAvatars of [true, false]) for (const showEmoji of [false, true]) for (const showImages of [true, false]) {
      await store.write({ showAvatars, showEmoji, showImages });
      await vi.waitFor(() => {
        expect(document.documentElement.dataset.scShowAvatars).toBe(String(showAvatars));
        expect(document.querySelectorAll('[data-sc-media="hidden"]').length).toBe(showImages ? 0 : 3);
        expect(Boolean(document.querySelector('[data-sc-emoji-proxy]'))).toBe(!showEmoji);
        expect([...document.querySelectorAll('.sc-tool')].find(button => button.textContent?.includes('프로필 사진 표시'))?.getAttribute('aria-pressed')).toBe(String(showAvatars));
      });
    }
    expect(document.querySelector('.avatar_fixture')).toBe(avatar);
    avatar.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    surface().list!.insertAdjacentHTML('beforeend', messageMarkup(99, '새 사진', '새 메시지', { image: true }));
    await vi.waitFor(() => expect(document.querySelectorAll('[data-sc-media="hidden"]').length).toBe(4));
    expect(document.getElementById('chat-messages-1000-99')!.querySelector('[data-sc-message-avatar]')).not.toBeNull();
    document.getElementById('chat-messages-1000-99')!.remove();
    await store.write({ showAvatars: true, showImages: true, showEmoji: false });
    controller.destroy();
    expect(native.innerHTML).toBe(snapshot);
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(document.documentElement.dataset.scShowAvatars).toBe('true'));
    expect(document.querySelectorAll('[data-sc-media="expanded"]').length).toBe(3);
    expect(document.querySelector('[data-sc-emoji-proxy]')).not.toBeNull();
  });
  it('converts sidebar, sheet and author emoji and keeps reply avatars hidden in the emoji presentation', async () => {
    const channel = document.querySelector('.name_fixture')!;
    channel.textContent = '일반 👍';
    document.querySelector('[data-list-item-id="guildsnav___100"]')!.setAttribute('aria-label', '서버 👍');
    document.querySelector('[id^="message-username-"]')!.textContent = '작성자 👍';
    const reply = document.querySelector('.repliedMessage_fixture')!;
    reply.insertAdjacentHTML('beforeend', '<img class="avatar_fixture" src="data:image/gif;base64,R0lGODlh"> 👍');
    const store = new MemoryStore({ showEmoji: false });
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(channel.nextElementSibling?.textContent).toBe('일반 :thumbsup:'));
    expect(document.querySelector('[data-sc-tab="100"]')!.textContent).toBe('서버 :thumbsup:');
    expect(document.querySelector('.sc-row-author')!.textContent).toBe('작성자 :thumbsup:');
    expect(reply.nextElementSibling!.querySelector('[data-sc-avatar]')).not.toBeNull();
    await store.write({ showEmoji: true });
    await vi.waitFor(() => expect(document.querySelector('[data-sc-tab="100"]')!.textContent).toBe('서버 👍'));
    expect(channel.textContent).toBe('일반 👍');
    expect(document.querySelector('[data-sc-emoji-proxy]')).toBeNull();
  });
  it('themes the complete nested sidebar and restores its original DOM on disable', async () => {
    addDarkSidebarFixture();
    const column = document.querySelector<HTMLElement>('.sidebar_fixture')!;
    const snapshot = column.outerHTML;
    const link = column.querySelector<HTMLElement>('a[aria-current="page"]')!;
    const selected = vi.fn();
    link.addEventListener('click', selected);
    const store = new MemoryStore();
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(column.hasAttribute('data-sc-sidebar')).toBe(true));
    expect(column.querySelector('[data-sc-sidebar]')).toBeNull();
    link.click();
    expect(selected).toHaveBeenCalledTimes(1);
    await store.write({ sidebarCollapsed: true });
    await vi.waitFor(() => expect(document.documentElement.dataset.scSidebarCollapsed).toBe('true'));
    await store.write({ enabled: false });
    expect(column.outerHTML).toBe(snapshot);
  });
  it('uses only storage permissions, a local script and Discord chat match patterns', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.content_scripts[0].matches).toEqual(['https://discord.com/channels/*', 'https://discord.com/store*', 'https://discord.com/shop*', 'https://discord.com/quest-home*']);
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
  it('refreshes late aria-labelledby and title changes while retaining selection and full labels', async () => {
    const source = document.querySelector<HTMLElement>('[data-list-item-id="guildsnav___100"]')!;
    source.setAttribute('aria-label', ' ');
    source.textContent = '';
    const label = document.createElement('span');
    label.id = 'late-name';
    label.hidden = true;
    label.textContent = '참조로 늦게 표시된 긴 서버 이름 · ' + '스프레드시트 '.repeat(8).trim();
    document.body.append(label);
    controller = new SheetcordController(new MemoryStore());
    await controller.start();
    await vi.waitFor(() => expect(document.querySelector('[data-sc-tab="100"]')?.textContent).toBe('서버 (100)'));
    source.setAttribute('aria-labelledby', 'late-name');
    await vi.waitFor(() => expect(document.querySelector('[data-sc-tab="100"]')?.textContent).toBe(label.textContent));
    const tab = document.querySelector('[data-sc-tab="100"]')!;
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(tab.getAttribute('title')).toBe(label.textContent);
    expect(tab.getAttribute('aria-label')).toBe(label.textContent);
    source.removeAttribute('aria-labelledby');
    source.setAttribute('title', '나중에 제공된 제목');
    await vi.waitFor(() => expect(document.querySelector('[data-sc-tab="100"]')?.textContent).toBe('나중에 제공된 제목'));
  });
  it('treats reply portraits as avatars without attachment placeholders and restores native markup', async () => {
    addMessageParityFixture();
    const nativeRow = document.querySelector('[data-parity-case="reply"][data-parity-variant="native"]')!;
    const original = nativeRow.innerHTML;
    controller = new SheetcordController(new MemoryStore());
    await controller.start();
    await vi.waitFor(() => expect(nativeRow.querySelector('.replyAvatar_parity')?.hasAttribute('data-sc-avatar')).toBe(true));
    expect(nativeRow.querySelector('.sc-media-toggle')).toBeNull();
    expect(nativeRow.querySelector('.replyAvatar_parity')?.hasAttribute('data-sc-message-avatar')).toBe(false);
    controller.destroy();
    expect(nativeRow.innerHTML).toBe(original);
  });
  it('waits for server entries that hydrate after the navigation container', async () => {
    const guilds = surface().guilds;
    const entries = [...guilds.childNodes];
    guilds.replaceChildren();
    controller = new SheetcordController(new MemoryStore());
    await controller.start();
    await wait(100);
    expect(document.querySelector('[role="status"]')?.textContent ?? '').not.toContain('원래 화면');
    guilds.append(...entries);
    await vi.waitFor(() => expect(document.querySelector('.sc-header')).not.toBeNull());
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
  it('applies rapid display toggles before storage settles, without requiring a change event', async () => {
    const store = new MemoryStore();
    const writes: { patch: Partial<Settings>; resolve: () => void }[] = [];
    store.write = patch => new Promise<void>(resolve => writes.push({ patch, resolve }));
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(document.querySelector('.sc-header')).not.toBeNull());
    for (const [label, key, attribute] of [
      ['프로필 사진 표시', 'showAvatars', 'data-sc-show-avatars'],
      ['이미지 표시', 'showImages', 'data-sc-show-images'],
      ['이모지 표시', 'showEmoji', 'data-sc-show-emoji'],
    ] as const) {
      const control = [...document.querySelectorAll<HTMLButtonElement>('.sc-tool')].find(e => e.textContent?.includes(label))!;
      control.click();
      await vi.waitFor(() => expect(document.documentElement.getAttribute(attribute)).toBe('true'));
      // An older storage notification must not undo this pending click.
      store.listeners.forEach(listener => listener({ ...defaults }));
      await wait();
      expect(document.documentElement.getAttribute(attribute)).toBe('true');
      control.click();
      control.click();
      expect(writes.slice(-2).map(write => write.patch)).toEqual([{ [key]: false }, { [key]: true }]);
      await vi.waitFor(() => expect(document.documentElement.getAttribute(attribute)).toBe('true'));
    }
    for (const write of writes) { write.resolve(); await Promise.resolve(); }
    await wait();
    for (const attribute of ['data-sc-show-avatars', 'data-sc-show-images', 'data-sc-show-emoji']) {
      expect(document.documentElement.getAttribute(attribute)).toBe('true');
    }
  });
  it('restores a failed toggle and allows another click without reloading', async () => {
    const store = new MemoryStore();
    let rejectWrite!: (reason: Error) => void;
    store.write = () => new Promise<void>((_resolve, reject) => { rejectWrite = reject; });
    controller = new SheetcordController(store);
    await controller.start();
    await vi.waitFor(() => expect(document.querySelector('.sc-header')).not.toBeNull());
    const control = [...document.querySelectorAll<HTMLButtonElement>('.sc-tool')].find(e => e.textContent?.includes('이미지 표시'))!;
    control.click();
    await vi.waitFor(() => expect(document.documentElement.dataset.scShowImages).toBe('true'));
    rejectWrite(new Error('storage unavailable'));
    await vi.waitFor(() => expect(document.documentElement.dataset.scShowImages).toBe('false'));
    expect(control.getAttribute('aria-pressed')).toBe('false');
    store.write = async () => {};
    control.click();
    await vi.waitFor(() => expect(document.documentElement.dataset.scShowImages).toBe('true'));
  });
  it('does not let a stale startup read overwrite a newer settings notification', async () => {
    const store = new MemoryStore();
    let resolveRead!: (settings: Settings) => void;
    store.read = () => new Promise<Settings>(resolve => { resolveRead = resolve; });
    controller = new SheetcordController(store);
    const started = controller.start();
    store.listeners.forEach(listener => listener({ ...defaults, showImages: true }));
    resolveRead({ ...defaults });
    await started;
    await vi.waitFor(() => expect(document.documentElement.dataset.scShowImages).toBe('true'));
  });
  it('migrates old preferences and serializes rapid writes without dropping another switch', async () => {
    let stored = { enabled: true, showEmoji: false, sidebarCollapsed: true } as Settings;
    vi.stubGlobal('chrome', { storage: { local: {
      get: async () => ({ [settingsKey]: { ...stored } }),
      set: async (value: Record<string, Settings>) => { await wait(5); stored = value[settingsKey]; },
    } } });
    const store = chromeSettings();
    expect(await store.read()).toEqual({ ...defaults, showEmoji: false, sidebarCollapsed: true });
    await Promise.all([store.write({ showAvatars: true }), store.write({ showImages: true })]);
    expect(await store.read()).toEqual({ ...defaults, showEmoji: false, sidebarCollapsed: true, showAvatars: true, showImages: true });
  });
  it('discards unknown fields and invalid values', () => {
    expect(sanitizeSettings({ enabled: false, showEmoji: 'false', sidebarCollapsed: 1, token: 'must-not-persist' }))
      .toEqual({ ...defaults, enabled: false });
    expect(sanitizeSettings(null)).toEqual(defaults);
  });
  it('persists only the display preferences and custom tab title through chrome.storage.local', async () => {
    const set = vi.fn(async () => {});
    const get = vi.fn(async () => ({ [settingsKey]: { ...defaults, unknown: 'discard' } }));
    vi.stubGlobal('chrome', { storage: { local: { get, set } } });
    await chromeSettings().write({ showEmoji: false });
    expect(set).toHaveBeenCalledWith({ [settingsKey]: { ...defaults, showEmoji: false } });
  });
});
