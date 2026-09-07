/** All changes to Discord-owned elements are reversible. No nodes are reparented. */
export class DomPatches {
  private attributes = new Map<Element, Map<string, { before: string | null; applied: string }>>();

  set(element: Element, key: string, value = '') {
    let changes = this.attributes.get(element);
    if (!changes) this.attributes.set(element, changes = new Map());
    const previous = changes.get(key);
    if (!previous) changes.set(key, { before: element.getAttribute(key), applied: value });
    else previous.applied = value;
    if (element.getAttribute(key) !== value) element.setAttribute(key, value);
  }

  restore() {
    for (const [element, changes] of this.attributes) {
      for (const [key, { before, applied }] of changes) {
        if (element.getAttribute(key) !== applied) continue;
        if (before === null) element.removeAttribute(key);
        else element.setAttribute(key, before);
      }
    }
    this.attributes.clear();
  }

  reset(element: Element, key: string) {
    const changes = this.attributes.get(element);
    const change = changes?.get(key);
    if (!change) return;
    if (element.getAttribute(key) === change.applied) {
      if (change.before === null) element.removeAttribute(key);
      else element.setAttribute(key, change.before);
    }
    changes!.delete(key);
    if (!changes!.size) this.attributes.delete(element);
  }

  prune() {
    for (const element of this.attributes.keys()) if (!element.isConnected) this.attributes.delete(element);
  }
}

export function owned<K extends keyof HTMLElementTagNameMap>(tag: K, className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.dataset.scOwned = '';
  node.className = className;
  return node;
}

export function isOwned(node: Node | null): boolean {
  return Boolean((node instanceof Element ? node : node?.parentElement)?.closest('[data-sc-owned]'));
}

export function queryNative<T extends Element = HTMLElement>(root: ParentNode, selector: string): T | null {
  return [...root.querySelectorAll<T>(selector)].find(node => !isOwned(node)) ?? null;
}

export function allNative<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll<T>(selector)].filter(node => !isOwned(node));
}

export function button(label: string, action: () => void, className = ''): HTMLButtonElement {
  const node = owned('button', className);
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', action);
  return node;
}
