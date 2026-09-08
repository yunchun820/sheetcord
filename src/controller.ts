import { DiscordAdapter, type Surface } from './adapter';
import { DomPatches, isOwned, button, owned } from './dom';
import { EmojiController } from './emoji';
import { MediaController } from './media';
import { MessageGrid } from './messages';
import { AvatarController } from './avatars';
import { AppearanceController } from './appearance';
import { TabController } from './tab';
import { defaults, type Settings, type SettingsStore } from './settings';
import { WorkbookShell } from './shell';
import theme from './theme.css?inline';

export class SheetcordController {
  private settings: Settings = { ...defaults };
  private savedSettings: Settings = { ...defaults };
  private pendingSettings = new Map<number, Partial<Settings>>();
  private settingsRevision = 0;
  private nextWrite = 0;
  private patches = new DomPatches();
  private media = new MediaController(() => this.schedule());
  private emoji = new EmojiController();
  private grid = new MessageGrid();
  private avatars = new AvatarController();
  private appearance = new AppearanceController();
  private tab = new TabController();
  private shell: WorkbookShell | null = null;
  private style: HTMLStyleElement | null = null;
  private observer: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private observedForm: HTMLElement | null = null;
  private observedList: HTMLElement | null = null;
  private unwatch: (() => void) | null = null;
  private frame = 0;
  private missingTimer = 0;
  private notice: HTMLElement | null = null;
  private disposed = false;
  private running = false;
  private adapter: DiscordAdapter;
  private geometryFrame = 0;
  private surfaceMarks = new Map<Element, string>();

  constructor(private store: SettingsStore, adapter = new DiscordAdapter()) { this.adapter = adapter; }

  async start() {
    this.unwatch = this.store.subscribe(settings => {
      this.settingsRevision++;
      this.savedSettings = settings;
      this.applySettings();
    });
    const revision = this.settingsRevision;
    try {
      const settings = await this.store.read();
      if (revision === this.settingsRevision) this.savedSettings = settings;
    }
    catch { this.showNotice('표시 설정을 읽지 못했습니다. 확장 프로그램을 새로고침해 주세요.'); return; }
    if (this.disposed) return;
    this.applySettings();
  }

  private applySettings() {
    if (this.disposed) return;
    this.settings = Object.assign({}, this.savedSettings, ...this.pendingSettings.values());
    if (this.settings.enabled) this.activate();
    else { this.stop(); this.notice?.remove(); }
  }

  private updateSettings(patch: Partial<Settings>) {
    const id = ++this.nextWrite;
    this.pendingSettings.set(id, patch);
    this.applySettings();
    void this.store.write(patch).then(() => {
      this.savedSettings = { ...this.savedSettings, ...patch };
      this.pendingSettings.delete(id);
      this.applySettings();
    }, () => {
      this.pendingSettings.delete(id);
      this.applySettings();
      this.shell?.message('설정을 저장하지 못해 이전 값으로 복원했습니다. 다시 시도해 주세요.');
    });
  }

  private activate() {
    this.notice?.remove();
    this.notice = null;
    if (this.running) { this.schedule(); return; }
    this.running = true;
    this.observer = new MutationObserver(records => {
      if (records.some(record => !isOwned(record.target) && (record.type !== 'childList'
        || [...record.addedNodes, ...record.removedNodes].some(node => !isOwned(node))))) this.schedule();
    });
    this.observer.observe(document.body, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['class', 'aria-label', 'aria-labelledby', 'aria-describedby', 'title', 'alt', 'id', 'data-list-item-id', 'aria-selected', 'aria-current', 'aria-pressed', 'src', 'datetime'],
    });
    window.addEventListener('popstate', this.schedule);
    window.addEventListener('resize', this.schedule);
    this.schedule();
  }

  private schedule = () => {
    if (!this.running || this.frame) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.refresh(); });
  };

  private refresh() {
    if (!this.running) return;
    try {
      // Login and public marketing pages have no authenticated workspace.
      const surface = this.adapter.discover();
      if (!surface) {
        if (!this.missingTimer) this.missingTimer = window.setTimeout(() => {
          this.missingTimer = 0;
          if (!this.adapter.discover()) this.fail('디스코드 화면 구조를 확인하지 못해 원래 화면으로 돌아왔습니다. 대화를 연 뒤 다시 적용해 주세요.');
          else this.schedule();
        }, 2500);
        return;
      }
      const tabs = this.adapter.tabs(surface);
      // Navigation mounts before its server entries during a full page load.
      if (!tabs.length) {
        if (!this.missingTimer) this.missingTimer = window.setTimeout(() => {
          this.missingTimer = 0;
          const ready = this.adapter.discover();
          if (ready && this.adapter.tabs(ready).length) this.schedule();
          else this.fail('서버 탐색 항목을 찾지 못해 원래 화면으로 돌아왔습니다.');
        }, 5000);
        return;
      }
      clearTimeout(this.missingTimer);
      this.missingTimer = 0;
      if (!this.shell) this.mount();
      this.tab.start(this.settings.tabTitle);
      this.decorate(surface);
      this.appearance.sync(surface.root);
      const rows = this.adapter.rows(surface);
      this.grid.sync(rows, location.pathname, this.settings.showEmoji);
      this.avatars.sync(surface.root, rows);
      this.media.sync(rows, location.pathname, this.settings.showImages);
      const emojiSources = this.settings.showEmoji ? []
        : [...this.adapter.emojiLabels(surface), ...this.appearance.emojiSources(surface.root)];
      this.emoji.sync(rows, this.settings.showEmoji, emojiSources);
      this.shell!.render(this.settings, tabs, this.adapter.channelLabel(surface), Boolean(surface.form), this.adapter.channels(surface));
      this.patches.prune();
    } catch {
      this.fail('화면 적용 중 문제가 생겨 원래 디스코드 화면으로 복원했습니다.');
    }
  }

  private mount() {
    this.style = owned('style');
    this.style.textContent = theme;
    document.head.append(this.style);
    this.shell = new WorkbookShell({
      update: patch => this.updateSettings(patch),
      collapseImages: () => { this.media.collapseAll(); this.shell?.message('이미지를 모두 접었습니다.'); },
      search: () => {
        this.patches.set(document.documentElement, 'data-sc-search-open');
        if (!this.adapter.focusSearch()) this.shell?.message('이 화면에서는 디스코드 검색 입력란을 찾을 수 없습니다.');
      },
    });
    this.shell.mount();
  }

  private decorate(surface: Surface) {
    this.observedList = surface.list;
    this.patches.set(document.documentElement, 'data-sc-active');
    this.patches.set(document.documentElement, 'data-sc-sidebar-collapsed', String(this.settings.sidebarCollapsed));
    this.patches.set(document.documentElement, 'data-sc-show-avatars', String(this.settings.showAvatars));
    this.patches.set(document.documentElement, 'data-sc-show-images', String(this.settings.showImages));
    this.patches.set(document.documentElement, 'data-sc-show-emoji', String(this.settings.showEmoji));
    this.patches.set(document.documentElement, 'data-sc-view', /^\/(store|shop|quest-home)/.test(location.pathname) ? 'catalog' : 'conversation');
    this.patches.set(document.documentElement, 'data-sc-has-composer', String(Boolean(surface.form)));
    const marks = new Map<Element, string>([
      [surface.root, 'data-sc-root'],
      [surface.guilds.closest('nav') ?? surface.guilds, 'data-sc-guilds'],
      [surface.sidebar, 'data-sc-sidebar'],
      [surface.chat, 'data-sc-chat'],
    ]);
    if (surface.list) marks.set(surface.list, 'data-sc-messages');
    if (surface.header) marks.set(surface.header, 'data-sc-native-header');
    for (const member of surface.members) marks.set(member, 'data-sc-members');
    if (surface.form) {
      marks.set(surface.form, 'data-sc-form');
      if (surface.editor) marks.set(surface.editor, 'data-sc-editor');
    }
    for (const [element, attribute] of this.surfaceMarks) if (marks.get(element) !== attribute) this.patches.reset(element, attribute);
    for (const [element, attribute] of marks) this.patches.set(element, attribute);
    this.surfaceMarks = marks;
    if (this.observedForm !== surface.form) {
      this.resizeObserver?.disconnect();
      this.observedForm = surface.form;
      if (surface.form && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          cancelAnimationFrame(this.geometryFrame);
          this.geometryFrame = requestAnimationFrame(() => this.measureForm());
        });
        this.resizeObserver.observe(surface.form);
      }
    }
    this.measureForm();
  }

  private measureForm() {
    if (!this.running) return;
    const height = this.observedForm?.isConnected ? Math.max(42, Math.min(140, Math.ceil(this.observedForm.getBoundingClientRect().height) + 8)) : 42;
    // Extension-owned style node; no edits to Discord's inline style or layout state.
    const geometry = this.style?.dataset.formHeight;
    const listRect = this.observedList?.isConnected ? this.observedList.getBoundingClientRect() : null;
    const gap = listRect?.width ? Math.max(0, window.innerWidth - listRect.right) : 0;
    if (this.style && (geometry !== String(height) || this.style.dataset.sheetGap !== String(gap))) {
      this.style.dataset.formHeight = String(height);
      this.style.dataset.sheetGap = String(gap);
      this.style.textContent = `${theme}\nhtml[data-sc-active]{--sc-form-height:${height}px;--sc-sheet-right-gap:${gap}px}`;
    }
  }

  private stop() {
    this.tab.clear();
    this.running = false;
    this.observer?.disconnect();
    this.observer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedForm = null;
    this.observedList = null;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.geometryFrame);
    clearTimeout(this.missingTimer);
    this.frame = this.missingTimer = this.geometryFrame = 0;
    window.removeEventListener('popstate', this.schedule);
    window.removeEventListener('resize', this.schedule);
    this.emoji.clear();
    this.appearance.clear();
    this.avatars.clear();
    this.media.clear();
    this.grid.clear();
    this.patches.restore();
    this.surfaceMarks.clear();
    this.shell?.destroy();
    this.shell = null;
    this.style?.remove();
    this.style = null;
  }

  private showNotice(message: string) {
    this.notice?.remove();
    const panel = owned('aside');
    panel.setAttribute('role', 'status');
    panel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;max-width:390px;background:#fff;color:#24372e;border:1px solid #c5d8cd;border-radius:8px;padding:18px;font:13px/1.7 system-ui;box-shadow:0 8px 30px #0003';
    const label = owned('div');
    label.textContent = `Sheetcord · ${message}`;
    const retry = button('다시 적용', () => this.retry());
    const close = button('닫기', () => { panel.remove(); this.notice = null; });
    for (const control of [retry, close]) control.style.cssText = 'margin:12px 8px 0 0;padding:6px 12px;border:1px solid #b3c8bc;background:#eef5f1;color:#174b32;border-radius:4px;cursor:pointer';
    panel.append(label, retry, close);
    document.body.append(panel);
    this.notice = panel;
  }

  private fail(message: string) { this.stop(); this.showNotice(message); }

  retry() { this.stop(); if (this.settings.enabled) this.activate(); }

  destroy() {
    this.disposed = true;
    this.stop();
    this.unwatch?.();
    this.unwatch = null;
    this.notice?.remove();
    this.notice = null;
  }
}
