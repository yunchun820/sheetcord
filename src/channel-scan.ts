import { allNative } from './dom';
import { selectors, type ChannelEntry } from './adapter';

/** Visit the native virtual list, then restore its scroll position. No private APIs. */
export class ChannelScanner {
  private cancelRun: (() => void) | null = null;
  private completed = '';
  private active = '';

  scan(sidebar: HTMLElement, server: string, collect: () => ChannelEntry[], finish: (entries: ChannelEntry[]) => void, force = false) {
    if (this.active === server || (!force && this.completed === server)) return;
    this.cancelRun?.();
    // Prefer the inner channel list over a scrollable workspace wrapper.
    const scroller = [sidebar, ...allNative<HTMLElement>(sidebar, '*')].reverse().find(node =>
      node.clientHeight > 0 && node.scrollHeight > node.clientHeight + 1
      && /auto|scroll/.test(getComputedStyle(node).overflowY)
      && node.querySelector(selectors.sidebarChannel));
    if (!scroller) return;
    this.active = server;
    const originalTop = scroller.scrollTop;
    const originalBehavior = scroller.style.getPropertyValue('scroll-behavior');
    const originalPriority = scroller.style.getPropertyPriority('scroll-behavior');
    scroller.style.setProperty('scroll-behavior', 'auto', 'important');
    let cancelled = false;
    let restored = false;
    const current = () => location.pathname.split('/')[2] === server && sidebar.isConnected && scroller.isConnected;
    const restore = () => {
      if (restored) return;
      restored = true;
      scroller.style.setProperty('scroll-behavior', originalBehavior, originalPriority);
      if (!originalBehavior) scroller.style.removeProperty('scroll-behavior');
      sidebar.removeAttribute('data-sc-channel-scanning');
      scroller.removeEventListener('wheel', cancel);
      scroller.removeEventListener('pointerdown', cancel);
      scroller.removeEventListener('keydown', cancel);
      if (current()) scroller.scrollTop = originalTop;
    };
    const cancel = () => { cancelled = true; restore(); };
    this.cancelRun = cancel;
    for (const type of ['wheel', 'pointerdown', 'keydown']) scroller.addEventListener(type, cancel);
    sidebar.setAttribute('data-sc-channel-scanning', '');
    const observed = new Map<string, ChannelEntry>();
    void (async () => {
      try {
        let position = 0;
        for (let step = 0; step < 300 && !cancelled && current(); step++) {
          scroller.scrollTop = position;
          await new Promise(resolve => setTimeout(resolve, 60));
          if (cancelled || !current()) return;
          const visible = collect().filter(entry => entry.source.isConnected && sidebar.contains(entry.source));
          visible.sort((a, b) => a.source === b.source ? 0 : a.source.compareDocumentPosition(b.source) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
          for (const entry of visible) observed.set(entry.key, entry);
          const end = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          if (scroller.scrollTop >= end - 1) {
            this.completed = server;
            finish([...observed.values()]);
            return;
          }
          position = Math.min(end, scroller.scrollTop + Math.max(1, scroller.clientHeight * .75));
        }
      } finally {
        // A cancelled or bounded pass may be retried explicitly from the menu.
        if (this.cancelRun === cancel && current()) this.completed = server;
        restore();
        if (this.cancelRun === cancel) { this.cancelRun = null; this.active = ''; }
      }
    })().catch(() => {});
    return true;
  }

  clear() { this.cancelRun?.(); this.cancelRun = null; this.active = ''; this.completed = ''; }
}
