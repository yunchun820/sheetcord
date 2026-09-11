import { button, isOwned, DomPatches } from './dom';
import { selectors, stickerDetails } from './adapter';
import { emojiText } from './emoji';

interface MediaEntry { target: HTMLElement; control: HTMLButtonElement; key: string; expanded: boolean }

// CSS applies even between native DOM insertion and our next animation-frame sync.
// Include empty loading shells: they may exist for seconds before an img/canvas does.
const loadingVisual = `:is(${selectors.attachment}, [class*="stickerContainer_"], [class*="stickerWrapper_"], [class*="stickerAsset_"], [class*="clickableSticker"])`;
const loadingRow = `html[data-sc-active] #app-mount :is(${selectors.row})`;
const unmanaged = ':not([data-sc-media]):not([data-sc-media] *):not([class*="welcomeCTA_"] *):not([data-sc-media-layout]):not(:has([data-sc-media], .sc-media-toggle))';
export const mediaLoadingStyle = `
${loadingRow} ${loadingVisual}${unmanaged},
${loadingRow} :is([class*="mosaic"], [class*="attachmentContainer_"], [class*="mediaContainer_"]):has(${loadingVisual})${unmanaged} {
  display: none !important;
}
${loadingRow}:has(${loadingVisual}):not(:has([data-sc-media="expanded"])) {
  height: auto !important; min-height: 38px !important;
}
${loadingRow}:has(${loadingVisual}):not(:has([data-sc-media="expanded"])) > [class*="message_"] {
  height: auto !important; min-height: 0 !important;
}
/* Before grid decoration, a media-only row still has Discord's normal author header. */
${loadingRow}:not([data-sc-row], [data-sc-row] *):has(${loadingVisual}):not(:has([id^="message-content-"]:not(:empty), [data-sc-media="expanded"])) {
  height: 39px !important; min-height: 39px !important; max-height: 39px !important; overflow: hidden !important;
}
`;

/** Hide only the visual wrapper. Spoiler overlays stay inside it and remain untouched. */
export class MediaController {
  private entries = new Map<HTMLElement, MediaEntry>();
  private expandedKeys = new Set<string>();
  private route = '';
  private layouts = new Set<HTMLElement>();
  private patches = new DomPatches();

  constructor(private onChange: () => void = () => {}) {}

  sync(rows: HTMLElement[], route: string) {
    if (route !== this.route) {
      this.clear();
      this.route = route;
    }
    for (const [target, entry] of this.entries) {
      if (!target.isConnected || !rows.some(row => row.contains(target))) {
        entry.control.remove();
        target.removeAttribute('data-sc-media');
        this.patches.reset(target, 'data-sc-sticker');
        this.entries.delete(target);
      }
    }
    const active = new Set<HTMLElement>();
    for (const row of rows) {
      // Lazy forum thumbnails may not mount an img until their wrapper is visible.
      const thumbnailShells = row.matches(selectors.forumListCard) ? [...row.querySelectorAll<HTMLElement>(selectors.forumThumbnail)] : [];
      const leaves = [...row.querySelectorAll<HTMLElement>(`${selectors.mediaLeaf}, [class*="embedVideo_"] iframe`), ...thumbnailShells].filter(leaf =>
        !isOwned(leaf) && !leaf.closest(`${selectors.avatar}, ${selectors.visuallyHidden}, [class*="welcomeCTA_"], [data-sc-avatar], [class*="avatarDecoration_"], [class*="clanTagChiplet_"], [class*="messageChipletContainerInner_"], img[src*="/clan-badges/"], .emoji, [class*="emoji"], [data-type="emoji"]`)
      );
      const candidates = [...new Set(leaves.map(leaf => {
        // Manage the preview, native play controls and replacement iframe as one video.
        const embedVideo = leaf.closest<HTMLElement>('[class*="embedVideo_"]');
        if (embedVideo && row.contains(embedVideo)) return embedVideo;
        if (stickerDetails(leaf)) {
          // Keep extension controls outside native sticker click/capture handlers.
          let action: HTMLElement | null = null;
          for (let node: HTMLElement | null = leaf; node && node !== row; node = node.parentElement) {
            if (node.matches('button, [role="button"], [class*="clickableSticker" i]') && !node.querySelector(selectors.content)) action = node;
          }
          if (action) return action;
        }
        const wrapper = leaf.closest<HTMLElement>(selectors.attachment);
        return wrapper && row.contains(wrapper) ? wrapper : leaf;
      }))];
      // Only outermost wrappers; a nested wrapper must not get a second toggle.
      const targets = candidates.filter(target => !candidates.some(other => other !== target && other.contains(target)));
      targets.forEach((target, index) => {
        active.add(target);
        const key = `${route}:${row.id || row.getAttribute('data-list-item-id') || row.getAttribute('data-item-id')
          || row.querySelector('[data-grid-item-id]')?.getAttribute('data-grid-item-id')}:${index}`;
        let entry = this.entries.get(target);
        if (entry && entry.key !== key) {
          entry.control.remove();
          this.entries.delete(target);
          entry = undefined;
        }
        if (!entry) {
          const control = button('', () => this.toggle(target), 'sc-media-toggle');
          control.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
          for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'keydown', 'keyup']) {
            control.addEventListener(type, event => event.stopPropagation());
          }
          entry = { target, control, key, expanded: this.expandedKeys.has(key) };
          this.entries.set(target, entry);
        }
        if (!entry.control.isConnected || entry.control.nextSibling !== target) target.before(entry.control);
        this.render(entry);
      });
    }
    for (const [target, entry] of this.entries) if (!active.has(target)) {
      entry.control.remove(); target.removeAttribute('data-sc-media');
      this.patches.reset(target, 'data-sc-sticker'); this.entries.delete(target);
    }
    this.syncLayouts();
  }

  private syncLayouts() {
    const current = new Map<HTMLElement, boolean>();
    for (const { target, expanded } of this.entries.values()) {
      for (let parent = target.parentElement; parent && !parent.matches(`${selectors.row}, ${selectors.forumCard}`); parent = parent.parentElement) {
        if (parent.matches(selectors.mediaLayout) || this.isMediaFrame(parent)) current.set(parent, Boolean(current.get(parent) || expanded));
      }
    }
    for (const old of this.layouts) if (!current.has(old)) this.patches.reset(old, 'data-sc-media-layout');
    for (const [layout, expanded] of current) {
      this.patches.set(layout, 'data-sc-media-layout', expanded ? 'expanded' : 'compact');
    }
    this.layouts = new Set(current.keys());
  }

  private isMediaFrame(element: HTMLElement): boolean {
    if (element.matches('[class*="message_"], [class*="contents_"], [data-sc-media], [data-sc-owned]')) return false;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim() || isOwned(node)) continue;
      if (!node.parentElement?.closest('[data-sc-media], [class*="hiddenVisually_"], [class*="hoverButtonGroup_"]')) return false;
    }
    // Preserve non-media interactive content, even when it has no text (e.g. an icon button).
    return ![...element.querySelectorAll('button, [role="button"], input, textarea')]
      .some(control => !isOwned(control) && !control.closest('[data-sc-media], [class*="hoverButtonGroup_"]'));
  }

  private render(entry: MediaEntry) {
    const value = entry.expanded ? 'expanded' : 'collapsed';
    if (entry.target.dataset.scMedia !== value) entry.target.dataset.scMedia = value;
    const sticker = stickerDetails(entry.target);
    if (sticker) this.patches.set(entry.target, 'data-sc-sticker');
    else this.patches.reset(entry.target, 'data-sc-sticker');
    const kind = sticker ? '스티커' : entry.target.matches('video, [class*="embedVideo_"]') || entry.target.querySelector('video, iframe') ? '영상' : '이미지';
    const spoiler = entry.target.closest('[class*="spoiler" i]') || entry.target.querySelector('[class*="spoiler" i]');
    const name = sticker && !spoiler ? emojiText(sticker.name) : '';
    const caption = name ? `[스티커: ${name}]` : kind;
    const label = entry.expanded ? `− ${kind} 접기` : `+ ${caption} 펼치기`;
    if (entry.control.textContent !== label) entry.control.textContent = label;
    entry.control.title = label;
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
      this.syncLayouts();
    });
  }

  collapseAll() {
    this.anchored(() => {
      this.expandedKeys.clear();
      for (const entry of this.entries.values()) {
        entry.expanded = false;
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
    this.expandedKeys.clear();
    this.patches.restore();
    this.layouts.clear();
  }
}
