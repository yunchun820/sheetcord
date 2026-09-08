import { owned } from './dom';

const transparentIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"/>');
const replacements = { href: transparentIcon, type: 'image/svg+xml', sizes: 'any' };
type Attribute = keyof typeof replacements;
type Snapshot = Record<Attribute, string | null>;

/** Keep native icon links and restore their latest page-authored attributes. */
export class TabController {
  private originals = new Map<HTMLLinkElement, Snapshot>();
  private fallback: HTMLLinkElement | null = null;
  private observer: MutationObserver | null = null;
  private title = '';
  private originalTitle = '';
  private appliedTitle: string | null = null;

  start(title: string) {
    this.title = title;
    if (this.observer) { this.syncTitle(); return; }
    this.sync();
    this.observer = new MutationObserver(records => {
      this.syncTitle();
      if (records.some(record => record.target instanceof HTMLLinkElement
        || [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches('link') || node.querySelector('link'))))) this.sync();
    });
    this.observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['rel', 'href', 'type', 'sizes'] });
    this.syncTitle();
  }

  private syncTitle() {
    if (!this.title) { this.restoreTitle(); return; }
    if (this.appliedTitle === null || document.title !== this.appliedTitle) this.originalTitle = document.title;
    this.appliedTitle = this.title;
    if (document.title !== this.title) document.title = this.title;
  }

  private restoreTitle() {
    if (this.appliedTitle !== null && document.title === this.appliedTitle) document.title = this.originalTitle;
    this.appliedTitle = null;
  }

  private sync() {
    const icons = [...document.head.querySelectorAll<HTMLLinkElement>('link')].filter(link => link !== this.fallback
      && (link.getAttribute('rel') ?? '').split(/\s+/).some(token => token.toLowerCase() === 'icon'));
    for (const [link, snapshot] of this.originals) if (!icons.includes(link)) {
      this.restore(link, snapshot);
      this.originals.delete(link);
    }
    for (const link of icons) {
      let snapshot = this.originals.get(link);
      if (!snapshot) {
        snapshot = { href: link.getAttribute('href'), type: link.getAttribute('type'), sizes: link.getAttribute('sizes') };
        this.originals.set(link, snapshot);
      }
      for (const name of Object.keys(replacements) as Attribute[]) {
        const value = link.getAttribute(name);
        if (value !== replacements[name]) {
          snapshot[name] = value;
          link.setAttribute(name, replacements[name]);
        }
      }
    }
    // An explicit transparent icon avoids the browser's /favicon.ico fallback.
    if (!icons.length) {
      if (!this.fallback) this.fallback = owned('link', 'sc-favicon');
      for (const [name, value] of Object.entries({ rel: 'icon', ...replacements })) {
        if (this.fallback.getAttribute(name) !== value) this.fallback.setAttribute(name, value);
      }
      if (this.fallback.parentElement !== document.head) document.head.append(this.fallback);
    } else {
      this.fallback?.remove();
      this.fallback = null;
    }
  }

  private restore(link: HTMLLinkElement, snapshot: Snapshot) {
    for (const name of Object.keys(replacements) as Attribute[]) {
      // Do not overwrite a native change that arrived just before teardown.
      if (link.getAttribute(name) !== replacements[name]) continue;
      const value = snapshot[name];
      if (value === null) link.removeAttribute(name);
      else link.setAttribute(name, value);
    }
  }

  clear() {
    this.observer?.disconnect();
    this.observer = null;
    this.restoreTitle();
    for (const [link, snapshot] of this.originals) this.restore(link, snapshot);
    this.originals.clear();
    this.fallback?.remove();
    this.fallback = null;
  }
}
