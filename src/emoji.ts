import emojiRegex from 'emoji-regex';
import { isOwned, owned } from './dom';
import { selectors } from './adapter';

const names: Record<string, string> = {
  '😀': 'grinning', '😄': 'smile', '😃': 'smiley', '😁': 'grin', '😊': 'blush',
  '😂': 'joy', '🤣': 'rofl', '🥹': 'holding_back_tears', '🥲': 'smiling_tear',
  '😍': 'heart_eyes', '🥰': 'smiling_hearts', '😎': 'sunglasses', '🤔': 'thinking',
  '👍': 'thumbsup', '👎': 'thumbsdown', '👋': 'wave', '🙏': 'pray', '👏': 'clap',
  '❤️': 'heart', '❤': 'heart', '💚': 'green_heart', '💯': '100', '🔥': 'fire',
  '✨': 'sparkles', '🎉': 'tada', '✅': 'check', '❌': 'x', '👀': 'eyes', '🚀': 'rocket',
  '💻': 'computer', '📎': 'paperclip', '📌': 'pushpin', '📊': 'bar_chart', '😭': 'sob',
};

export function emojiText(text: string): string {
  return text.replace(emojiRegex(), match => names[match] ? `:${names[match]}:`
    : `[이모지 ${[...match].map(character => `U+${character.codePointAt(0)!.toString(16).toUpperCase()}`).join(' ')}]`);
}

interface ProxyEntry { source: HTMLElement; proxy: HTMLElement; fingerprint: string }

/** A disposable presentation clone leaves React-owned text nodes completely intact. */
export class EmojiController {
  private entries = new Map<HTMLElement, ProxyEntry>();

  sync(rows: HTMLElement[], showEmoji: boolean) {
    if (showEmoji) { this.clear(); return; }
    const candidates = rows.flatMap(row => [...row.querySelectorAll<HTMLElement>(`${selectors.content}, ${selectors.reaction}`)])
      .filter(element => !isOwned(element) && !element.closest('[contenteditable="true"]') && !element.querySelector('[contenteditable="true"]'));
    const sources = candidates.filter(element => !candidates.some(other => other !== element && other.contains(element)));
    const active = new Set(sources);
    for (const [source, entry] of this.entries) {
      if (!source.isConnected || !active.has(source)) this.remove(entry);
    }
    for (const source of sources) {
      const fingerprint = JSON.stringify([...source.attributes].filter(attribute => !attribute.name.startsWith('data-sc-'))
        .map(attribute => [attribute.name, attribute.value])) + source.innerHTML;
      const current = this.entries.get(source);
      if (current?.fingerprint === fingerprint && current.proxy.isConnected) continue;
      if (current) this.remove(current);
      if (!emojiRegex().test(source.textContent ?? '') && !source.querySelector('img.emoji, img[class*="emoji"], [data-type="emoji"]')) continue;
      const mapping = new WeakMap<Node, Node>();
      const clone = (node: Node, insideCode = false): Node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const output = document.createTextNode(insideCode ? node.textContent ?? '' : emojiText(node.textContent ?? ''));
          mapping.set(output, node);
          return output;
        }
        if (!(node instanceof Element)) return node.cloneNode(false);
        if (node.matches('img.emoji, img[class*="emoji"], [data-type="emoji"]')) {
          const label = owned('span', 'sc-emoji-name');
          const alt = node.getAttribute('alt') || node.getAttribute('data-name') || node.getAttribute('aria-label') || '이모지';
          label.textContent = emojiText(alt);
          mapping.set(label, node);
          return label;
        }
        const output = node.cloneNode(false) as Element;
        for (const attribute of [...output.attributes]) {
          if (attribute.name === 'id' || attribute.name.startsWith('data-sc-') || attribute.name === 'contenteditable'
            || attribute.name.startsWith('on') || attribute.name === 'data-list-item-id') output.removeAttribute(attribute.name);
        }
        mapping.set(output, node);
        for (const child of node.childNodes) output.appendChild(clone(child, insideCode || node.matches('code, pre')));
        return output;
      };
      const proxy = clone(source) as HTMLElement;
      proxy.dataset.scOwned = '';
      proxy.dataset.scEmojiProxy = '';
      // Forward interactions to the original element, retaining native links, mentions and reactions.
      for (const kind of ['click', 'contextmenu'] as const) proxy.addEventListener(kind, event => {
        const original = event.target instanceof Node ? mapping.get(event.target) : null;
        if (!(original instanceof Element)) return;
        event.preventDefault();
        event.stopPropagation();
        original.dispatchEvent(new MouseEvent(kind, {
          bubbles: true, cancelable: true, view: window,
          button: event.button, buttons: event.buttons, clientX: event.clientX, clientY: event.clientY,
          ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey: event.shiftKey,
        }));
      });
      proxy.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLElement) {
          const original = mapping.get(event.target);
          if (original instanceof HTMLElement && (original.matches('[role="button"], button, a'))) {
            event.preventDefault();
            original.click();
          }
        }
      });
      source.dataset.scEmojiOriginal = '';
      source.after(proxy);
      this.entries.set(source, { source, proxy, fingerprint });
    }
  }

  private remove(entry: ProxyEntry) {
    entry.source.removeAttribute('data-sc-emoji-original');
    entry.proxy.remove();
    this.entries.delete(entry.source);
  }

  clear() { for (const entry of [...this.entries.values()]) this.remove(entry); }
}
