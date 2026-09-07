import { button, isOwned, owned } from './dom';
import { selectors } from './adapter';

interface MediaEntry { target: HTMLElement; control: HTMLButtonElement; key: string; expanded: boolean }

/** Hide only the visual wrapper. Spoiler overlays stay inside it and remain untouched. */
export class MediaController {
  private entries = new Map<HTMLElement, MediaEntry>();
  private expandedKeys = new Set<string>();
  private route = '';

  constructor(private onChange: () => void = () => {}) {}

  sync(rows: HTMLElement[], route: string) {
    if (route !== this.route) {
      this.clear();
      this.expandedKeys.clear();
      this.route = route;
    }
    for (const [target, entry] of this.entries) {
      if (!target.isConnected || !rows.some(row => row.contains(target))) {
        entry.control.remove();
        target.removeAttribute('data-sc-media');
        this.entries.delete(target);
      }
    }
    for (const row of rows) {
      const candidates = [...row.querySelectorAll<HTMLElement>(selectors.attachment)]
        .filter(target => !isOwned(target) && target.querySelector('img, video'));
      // Only outermost wrappers; a nested wrapper must not get a second toggle.
      const targets = candidates.filter(target => !candidates.some(other => other !== target && other.contains(target)));
      targets.forEach((target, index) => {
        const key = `${route}:${row.id || row.getAttribute('data-list-item-id')}:${index}`;
        let entry = this.entries.get(target);
        if (entry && entry.key !== key) {
          entry.control.remove();
          this.entries.delete(target);
          entry = undefined;
        }
        if (!entry) {
          const control = button('', () => this.toggle(target), 'sc-media-toggle');
          entry = { target, control, key, expanded: this.expandedKeys.has(key) };
          this.entries.set(target, entry);
        }
        if (!entry.control.isConnected || entry.control.nextSibling !== target) target.before(entry.control);
        this.render(entry);
      });
    }
  }

  private render(entry: MediaEntry) {
    const value = entry.expanded ? 'expanded' : 'collapsed';
    if (entry.target.dataset.scMedia !== value) entry.target.dataset.scMedia = value;
    const label = entry.expanded ? '− 이미지 접기' : '+ 이미지 펼치기';
    if (entry.control.textContent !== label) entry.control.textContent = label;
    entry.control.setAttribute('aria-expanded', String(entry.expanded));
  }

  private anchored(change: () => void) {
    const first = this.entries.values().next().value as MediaEntry | undefined;
    const list = first?.target.closest<HTMLElement>('[data-sc-messages]');
    let scroller = list?.parentElement ?? null;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
    const oldTop = scroller?.scrollTop ?? 0;
    const nearBottom = scroller ? scroller.scrollHeight - oldTop - scroller.clientHeight < 48 : false;
    const anchor = list ? [...list.querySelectorAll<HTMLElement>('[data-sc-row]')]
      .find(row => row.getBoundingClientRect().bottom > (scroller?.getBoundingClientRect().top ?? 0)) : null;
    const before = anchor?.getBoundingClientRect().top ?? 0;
    change();
    // Synchronous layout keeps the same visible row. Browser anchoring handles later image loads.
    if (scroller) {
      if (nearBottom) scroller.scrollTop = scroller.scrollHeight;
      else if (anchor) scroller.scrollTop = oldTop + anchor.getBoundingClientRect().top - before;
    }
    this.onChange();
  }

  toggle(target: HTMLElement) {
    const entry = this.entries.get(target);
    if (!entry) return;
    this.anchored(() => {
      entry.expanded = !entry.expanded;
      if (entry.expanded) this.expandedKeys.add(entry.key);
      else this.expandedKeys.delete(entry.key);
      this.render(entry);
    });
  }

  collapseAll() {
    this.anchored(() => {
      this.expandedKeys.clear();
      for (const entry of this.entries.values()) {
        entry.expanded = false;
        this.render(entry);
      }
    });
  }

  clear() {
    for (const entry of this.entries.values()) {
      entry.target.removeAttribute('data-sc-media');
      entry.control.remove();
    }
    this.entries.clear();
    this.expandedKeys.clear();
  }
}
