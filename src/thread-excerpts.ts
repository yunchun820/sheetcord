import { selectors } from './adapter';
import { allNative, button, DomPatches } from './dom';

/** Fold long thread starter text without rewriting or discarding native content. */
export class ThreadExcerpts {
  private entries = new Map<HTMLElement, { parent: HTMLElement; control: HTMLButtonElement; expanded: boolean; key: string }>();
  private expandedKeys = new Set<string>();
  private patches = new DomPatches();
  private route = '';

  sync(rows: HTMLElement[], route: string) {
    if (this.route !== route) { this.clear(); this.route = route; }
    const active = new Set<HTMLElement>();
    for (const row of rows) {
      if (!row.querySelector('[data-sc-thread-card]')) continue;
      const content = allNative<HTMLElement>(row, selectors.content).find(node => !node.closest('[data-sc-thread-card]'));
      if (!content?.parentElement || !content.parentElement.matches('[class*="contents_"]')) continue;
      const value = content.textContent ?? '';
      if (value.length <= 180 && value.split('\n').length <= 3) continue;
      active.add(content);
      const key = row.id || row.getAttribute('data-list-item-id') || content.id;
      let entry = this.entries.get(content);
      if (entry && entry.key !== key) {
        entry.control.remove(); this.patches.reset(entry.parent, 'data-sc-thread-excerpt');
        this.entries.delete(content); entry = undefined;
      }
      if (!entry) {
        const control = button('내용 펼치기', () => {
          const current = this.entries.get(content);
          if (!current) return;
          current.expanded = !current.expanded;
          if (current.expanded) this.expandedKeys.add(current.key); else this.expandedKeys.delete(current.key);
          this.render(current);
        }, 'sc-thread-expand');
        control.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
        for (const kind of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'keydown', 'keyup']) control.addEventListener(kind, event => event.stopPropagation());
        entry = { parent: content.parentElement, control, expanded: this.expandedKeys.has(key), key };
        this.entries.set(content, entry);
        content.after(control);
      }
      this.render(entry);
    }
    for (const [content, entry] of this.entries) if (!active.has(content)) {
      entry.control.remove(); this.patches.reset(entry.parent, 'data-sc-thread-excerpt'); this.entries.delete(content);
    }
  }
  private render(entry: { parent: HTMLElement; control: HTMLButtonElement; expanded: boolean }) {
    this.patches.set(entry.parent, 'data-sc-thread-excerpt', entry.expanded ? 'expanded' : 'collapsed');
    if (entry.control.getAttribute('aria-expanded') !== String(entry.expanded)) entry.control.setAttribute('aria-expanded', String(entry.expanded));
    const label = entry.expanded ? '내용 접기' : '내용 펼치기';
    if (entry.control.textContent !== label) entry.control.textContent = label;
  }
  clear() { for (const entry of this.entries.values()) entry.control.remove(); this.entries.clear(); this.expandedKeys.clear(); this.patches.restore(); }
}
