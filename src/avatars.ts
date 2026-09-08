import { selectors } from './adapter';
import { allNative, DomPatches } from './dom';

/** Keep the original image and its profile click handler; only mark its presentation. */
export class AvatarController {
  private patches = new DomPatches();
  private groups = new Map<string, Set<Element>>();

  private mark(attribute: string, targets: Element[]) {
    const current = new Set(targets);
    for (const old of this.groups.get(attribute) ?? []) if (!current.has(old)) this.patches.reset(old, attribute);
    for (const target of current) this.patches.set(target, attribute);
    this.groups.set(attribute, current);
  }

  sync(root: HTMLElement, rows: HTMLElement[]) {
    const candidates = allNative<HTMLElement>(root, selectors.avatar);
    const avatars = candidates.filter(node => !candidates.some(other => other !== node && other.contains(node)));
    const primary: HTMLElement[] = [];
    const withAvatar: HTMLElement[] = [];
    for (const row of rows) {
      const avatar = avatars.find(node => row.contains(node) && !node.closest(`${selectors.visuallyHidden}, [data-sc-thread-card], [class*="repliedMessage_"], [class*="avatarDecoration_"], [class*="embed_"]`));
      if (avatar) { primary.push(avatar); withAvatar.push(row); }
    }
    this.mark('data-sc-avatar', avatars);
    this.mark('data-sc-message-avatar', primary);
    this.mark('data-sc-has-avatar', withAvatar);
    this.patches.prune();
  }

  clear() { this.patches.restore(); this.groups.clear(); }
}
