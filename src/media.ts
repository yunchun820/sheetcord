import { button, isOwned, DomPatches } from './dom';
import { selectors, expressionName } from './adapter';
import { emojiText } from './emoji';

interface MediaEntry { target: HTMLElement; control: HTMLButtonElement; key: string; expanded: boolean }

/** Hide only the visual wrapper. Spoiler overlays stay inside it and remain untouched. */
export class MediaController {
  private entries = new Map<HTMLElement, MediaEntry>();
  private collapsedKeys = new Set<string>();
  private route = '';
  private showImages = false;
  private layouts = new Set<HTMLElement>();
  private patches = new DomPatches();

  constructor(private onChange: () => void = () => {}) {}

  sync(rows: HTMLElement[], route: string, showImages: boolean) {
    if (this.showImages !== showImages) this.anchored(() => this.reconcile(rows, route, showImages));
    else this.reconcile(rows, route, showImages);
  }

  private reconcile(rows: HTMLElement[], route: string, showImages: boolean) {
    if (route !== this.route) {
      this.clear();
      this.route = route;
    }
    this.showImages = showImages;
    for (const [target, entry] of this.entries) {
      if (!target.isConnected || !rows.some(row => row.contains(target))) {
        entry.control.remove();
        target.removeAttribute('data-sc-media');
        this.entries.delete(target);
      }
    }
    for (const row of rows) {
      const leaves = [...row.querySelectorAll<HTMLElement>(selectors.mediaLeaf)].filter(leaf =>
        !isOwned(leaf) && !leaf.closest(`${selectors.avatar}, [data-sc-avatar], [class*="avatarDecoration_"], .emoji, [class*="emoji"], [data-type="emoji"]`)
      );
      const candidates = [...new Set(leaves.map(leaf => {
        const wrapper = leaf.closest<HTMLElement>(selectors.attachment);
        return wrapper && row.contains(wrapper) ? wrapper : leaf;
      }))];
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
          entry = { target, control, key, expanded: !this.collapsedKeys.has(key) };
          this.entries.set(target, entry);
        }
        if (!entry.control.isConnected || entry.control.nextSibling !== target) target.before(entry.control);
        this.render(entry);
      });
    }
    this.syncLayouts();
  }

  private syncLayouts() {
    const current = new Map<HTMLElement, boolean>();
    for (const { target, expanded } of this.entries.values()) {
      for (let parent = target.parentElement; parent && !parent.matches(selectors.row); parent = parent.parentElement) {
        if (parent.matches(selectors.mediaLayout)) current.set(parent, Boolean(current.get(parent) || (this.showImages && expanded)));
      }
    }
    for (const old of this.layouts) if (!current.has(old)) this.patches.reset(old, 'data-sc-media-layout');
    for (const [layout, expanded] of current) {
      this.patches.set(layout, 'data-sc-media-layout', expanded ? 'expanded' : 'compact');
    }
    this.layouts = new Set(current.keys());
  }

  private render(entry: MediaEntry) {
    const value = !this.showImages ? 'hidden' : entry.expanded ? 'expanded' : 'collapsed';
    if (entry.target.dataset.scMedia !== value) entry.target.dataset.scMedia = value;
    const sticker = entry.target.matches('[class*="sticker"]') || entry.target.closest('[class*="sticker"]');
    const kind = sticker ? '스티커' : entry.target.matches('video') || entry.target.querySelector('video') ? '영상' : '이미지';
    const name = sticker && !entry.target.closest('[class*="spoiler"]') ? emojiText(expressionName(entry.target, '스티커')) : '';
    const label = !this.showImages ? (name && name !== kind ? `[${kind}: ${name}]` : `${kind} 숨김`) : entry.expanded ? `− ${kind} 접기` : `+ ${kind} 펼치기`;
    if (entry.control.textContent !== label) entry.control.textContent = label;
    entry.control.disabled = !this.showImages;
    entry.control.title = !this.showImages ? '리본의 이미지 표시를 켜면 볼 수 있습니다.' : '';
    entry.control.setAttribute('aria-expanded', String(this.showImages && entry.expanded));
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
    if (!entry || !this.showImages) return;
    this.anchored(() => {
      entry.expanded = !entry.expanded;
      if (entry.expanded) this.collapsedKeys.delete(entry.key);
      else this.collapsedKeys.add(entry.key);
      this.render(entry);
      this.syncLayouts();
    });
  }

  collapseAll() {
    if (!this.showImages) return;
    this.anchored(() => {
      for (const entry of this.entries.values()) {
        entry.expanded = false;
        this.collapsedKeys.add(entry.key);
        this.render(entry);
      }
      this.syncLayouts();
    });
  }

  clear() {
    for (const entry of this.entries.values()) {
      entry.target.removeAttribute('data-sc-media');
      entry.control.remove();
    }
    this.entries.clear();
    this.collapsedKeys.clear();
    this.patches.restore();
    this.layouts.clear();
  }
}
