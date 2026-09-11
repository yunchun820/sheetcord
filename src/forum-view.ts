import { selectors } from './adapter';
import { DomPatches, queryNative } from './dom';

/** Select the native list once per channel visit. Never modify virtual card coordinates. */
export class ForumView {
  private route = '';
  private attempted = false;
  private cancel: (() => void) | null = null;
  private closePending: (() => void) | null = null;

  constructor(private notice: (message: string) => void = () => {}) {}

  sync(root: HTMLElement, route: string) {
    if (this.route !== route) { this.clear(); this.route = route; }
    if (this.attempted) return;
    if (queryNative(root, selectors.forumList) || queryNative(document, selectors.forumViewMenu)) { this.attempted = true; return; }
    if (!queryNative(root, selectors.forumGallery)) return;
    // A native dialog/menu or focused editor belongs to the user. Retry on a later refresh.
    if (document.hidden || document.querySelector('[role="menu"], [role="dialog"], .sc-navigation-panel, .sc-help-panel')
      || document.activeElement?.closest('input, textarea, [contenteditable="true"]')) return;
    const opener = queryNative<HTMLButtonElement>(root, selectors.forumSortButton);
    if (!opener || opener.disabled || opener.getAttribute('aria-expanded') === 'true') return;
    this.attempted = true;
    const beforeFocus = document.activeElement as HTMLElement | null;
    const patches = new DomPatches();
    let phase: 'menu' | 'layout' = 'menu';
    let finished = false;
    let observer: MutationObserver | null = null;
    let timer = 0;
    let ourMenu: HTMLElement | null = null;
    const finish = (failed = false) => {
      if (finished) return;
      finished = true;
      observer?.disconnect(); clearTimeout(timer);
      document.removeEventListener('pointerdown', interrupt, true);
      document.removeEventListener('keydown', interrupt, true);
      document.removeEventListener('compositionstart', interrupt, true);
      this.cancel = null;
      ourMenu ??= queryNative<HTMLElement>(document, selectors.forumViewMenu);
      const focused = document.activeElement;
      const restoreFocus = focused === document.body || focused === opener || Boolean(ourMenu?.contains(focused));
      // Close only the menu we opened; never remove React-owned nodes.
      if (ourMenu?.isConnected) ourMenu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      else if (!failed && opener.isConnected && opener.getAttribute('aria-expanded') === 'true') this.closeLateMenu(opener);
      patches.restore();
      if (restoreFocus && beforeFocus?.isConnected) beforeFocus.focus({ preventScroll: true });
      if (failed) this.notice('포럼의 목록 보기를 확인하지 못했습니다. 정렬 및 보기에서 목록을 선택해 주세요.');
    };
    const interrupt = () => finish();
    const step = () => {
      if (finished) return;
      if (!root.isConnected || location.pathname !== route) { finish(); return; }
      if (phase === 'layout') {
        if (queryNative(root, selectors.forumList) && !queryNative(root, selectors.forumGallery)) finish();
        return;
      }
      const menu = queryNative<HTMLElement>(document, selectors.forumViewMenu);
      if (!menu) return;
      ourMenu = menu;
      const list = queryNative<HTMLElement>(menu, selectors.forumViewList);
      if (!list || list.getAttribute('aria-disabled') === 'true') { finish(true); return; }
      phase = 'layout';
      if (list.getAttribute('aria-checked') !== 'true') list.click();
      if (queryNative(root, selectors.forumList) && !queryNative(root, selectors.forumGallery)) finish();
    };
    this.cancel = () => finish();
    patches.set(document.documentElement, 'data-sc-forum-switching');
    observer = new MutationObserver(() => { try { step(); } catch { finish(true); } });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-expanded', 'data-list-item-id', 'data-grid-item-id'] });
    document.addEventListener('pointerdown', interrupt, true);
    document.addEventListener('keydown', interrupt, true);
    document.addEventListener('compositionstart', interrupt, true);
    timer = window.setTimeout(() => { ourMenu ??= queryNative<HTMLElement>(document, selectors.forumViewMenu); finish(true); }, 2000);
    try { opener.click(); step(); } catch { finish(true); }
  }

  /** A cancelled React update may still mount its menu. Only close that pending menu. */
  private closeLateMenu(opener: HTMLElement) {
    this.closePending?.();
    let timer = 0;
    const done = () => { observer.disconnect(); clearTimeout(timer); if (this.closePending === done) this.closePending = null; };
    const observer = new MutationObserver(() => {
      if (!opener.isConnected || opener.getAttribute('aria-expanded') !== 'true') { done(); return; }
      const menu = queryNative<HTMLElement>(document, selectors.forumViewMenu);
      if (menu) { done(); menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); }
    });
    this.closePending = done;
    observer.observe(document.body, { childList: true, subtree: true });
    timer = window.setTimeout(done, 2000);
  }

  clear() { this.closePending?.(); this.cancel?.(); this.route = ''; this.attempted = false; }
}
