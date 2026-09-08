import { allNative, DomPatches } from './dom';
import { expressionName, selectors } from './adapter';
import { emojiText } from './emoji';

/** Labels decorate native choices without changing their virtualized coordinates or events. */
export class PickerController {
  private patches = new DomPatches();
  private marked = new Set<HTMLElement>();

  sync(root: HTMLElement, showImages: boolean, showEmoji: boolean) {
    const current = new Set<HTMLElement>();
    for (const picker of allNative<HTMLElement>(root, selectors.expressionPicker)) {
      const isEmoji = picker.matches('#emoji-picker-tab-panel, [class*="emojiPicker_"]');
      if (isEmoji ? showEmoji : showImages) continue;
      const kind = isEmoji ? '이모지' : picker.matches('#gif-picker-tab-panel, [class*="gifPicker_"]') ? 'GIF' : '스티커';
      const candidates = allNative<HTMLElement>(picker, selectors.expressionItem).map(item => {
        const control = item.closest<HTMLElement>('button, [role="button"], [role="gridcell"]');
        return control && picker.contains(control) ? control : item;
      }).filter(item => !item.closest('[class*="categoryList_"]') && !item.querySelector('[class*="categoryText_"]'));
      for (const item of new Set(candidates)) {
        // The innermost control handles selection; never replace a surrounding result grid.
        if (candidates.some(other => other !== item && item.contains(other))) continue;
        const label = emojiText(expressionName(item, `${kind} (이름 없음)`));
        current.add(item);
        this.patches.set(item, 'data-sc-picker-label', label);
      }
    }
    for (const old of this.marked) if (!current.has(old)) this.patches.reset(old, 'data-sc-picker-label');
    this.marked = current;
    this.patches.prune();
  }

  clear() { this.patches.restore(); this.marked.clear(); }
}
