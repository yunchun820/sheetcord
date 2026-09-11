import { button, owned } from './dom';

export interface NavigationEntry {
  key: string;
  label: string;
  selected: boolean;
  unread?: boolean;
  folder?: boolean;
  child?: boolean;
  activate(): void;
}

/** A searchable native-navigation launcher; it never fetches or stores conversations. */
export class NavigationMenu {
  readonly opener: HTMLButtonElement;
  private entries: NavigationEntry[] = [];
  private panel: HTMLElement | null = null;
  private search: HTMLInputElement | null = null;
  private list: HTMLElement | null = null;
  private cleanup: (() => void) | null = null;
  private signature = '';

  constructor(private label: string, private beforeOpen: () => void, private anchor?: () => HTMLElement) {
    this.opener = button(label, () => this.panel ? this.close() : this.open(), 'sc-menu-label sc-navigation-toggle');
    this.opener.setAttribute('aria-haspopup', 'dialog');
    this.opener.setAttribute('aria-expanded', 'false');
    this.opener.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); if (!this.panel) this.open(); else this.search?.focus(); }
    });
  }

  update(entries: NavigationEntry[]) {
    this.entries = entries;
    const signature = JSON.stringify(entries.map(({ key, label, selected, unread, folder, child }) => ({ key, label, selected, unread, folder, child })));
    if (signature !== this.signature) { this.signature = signature; this.render(); }
  }

  open() {
    if (this.panel) return;
    this.beforeOpen();
    const trigger = this.anchor?.() ?? this.opener;
    const panel = owned('section', 'sc-navigation-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', this.label);
    const heading = owned('div', 'sc-navigation-heading');
    const title = owned('strong');
    title.textContent = this.label;
    const close = button('닫기', () => this.close());
    close.setAttribute('aria-label', `${this.label} 닫기`);
    heading.append(title, close);
    const search = owned('input', 'sc-navigation-search');
    search.type = 'search';
    search.placeholder = '이름으로 찾기';
    search.setAttribute('aria-label', `${this.label} 검색`);
    search.addEventListener('input', () => this.render());
    const list = owned('nav', 'sc-navigation-items');
    list.setAttribute('aria-label', `${this.label} 항목`);
    panel.append(heading, search, list);
    this.panel = panel; this.search = search; this.list = list;
    document.body.append(panel);
    trigger.setAttribute('aria-expanded', 'true');
    this.render();
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      const top = Math.max(0, rect.bottom);
      panel.style.top = `${top}px`;
      panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - panel.getBoundingClientRect().width - 8))}px`;
      panel.style.maxHeight = `${Math.max(0, Math.min(440, window.innerHeight - top - 12))}px`;
    };
    position();
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!panel.contains(target) && !trigger.contains(target)) this.close(false);
    };
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.close(); return; }
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const controls = [...list.querySelectorAll<HTMLButtonElement>('button')];
      if (!controls.length) return;
      event.preventDefault();
      const current = controls.indexOf(document.activeElement as HTMLButtonElement);
      const next = current < 0 ? (event.key === 'ArrowDown' ? 0 : controls.length - 1)
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
      controls[next].focus();
    });
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    window.addEventListener('resize', position);
    const menubar = trigger.parentElement;
    menubar?.addEventListener('scroll', position);
    this.cleanup = () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      window.removeEventListener('resize', position);
      menubar?.removeEventListener('scroll', position);
    };
    search.focus({ preventScroll: true });
  }

  private render() {
    if (!this.list || !this.search) return;
    const query = this.search.value.trim().toLocaleLowerCase();
    const matches = this.entries.filter(entry => entry.label.toLocaleLowerCase().includes(query));
    const focused = (document.activeElement as HTMLElement)?.dataset.scNavigationKey;
    const scroll = this.list.scrollTop;
    this.list.replaceChildren(...matches.map(entry => {
      const control = button('', () => {
        const current = this.entries.find(item => item.key === entry.key);
        this.close(false);
        current?.activate();
      }, 'sc-navigation-item');
      control.dataset.scNavigationKey = entry.key;
      control.title = entry.label;
      const label = owned('span');
      label.textContent = `${entry.child ? '↳ ' : entry.folder ? '▸ ' : ''}${entry.label}`;
      control.append(label);
      if (entry.selected) control.setAttribute('aria-current', 'page');
      if (entry.unread) {
        const unread = owned('span', 'sc-navigation-unread');
        unread.textContent = '•';
        unread.setAttribute('aria-label', '읽지 않은 메시지');
        control.append(unread);
      }
      return control;
    }));
    if (!matches.length) {
      const empty = owned('p', 'sc-navigation-empty');
      empty.textContent = query ? '일치하는 항목이 없습니다.' : '표시할 항목이 없습니다.';
      this.list.append(empty);
    }
    this.list.scrollTop = scroll;
    if (focused) {
      const next = [...this.list.querySelectorAll<HTMLElement>('[data-sc-navigation-key]')].find(item => item.dataset.scNavigationKey === focused);
      (next ?? this.search).focus({ preventScroll: true });
    }
  }

  close(restoreFocus = true) {
    if (!this.panel) return;
    this.cleanup?.(); this.cleanup = null;
    this.panel.remove(); this.panel = null; this.list = null; this.search = null;
    const trigger = this.anchor?.() ?? this.opener;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }
}
