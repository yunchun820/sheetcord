import { allNative, DomPatches, isOwned, owned } from './dom';
import emojiRegex from 'emoji-regex';
import { selectors } from './adapter';

const mediaControl = (control: HTMLElement) => Boolean(control.closest('[class*="imageWrapper"], [class*="videoWrapper_"], [class*="embedThumbnail_"]') || control.querySelector('[class*="loadingOverlay_"], video, canvas'));
const formIconControl = '[data-sc-form] [class*="prefixElement_"] [role="button"][class*="iconLayout_"][aria-hidden="false"]';

/** Presentation only: native controls and their event handlers stay in place. */
export class AppearanceController {
  private patches = new DomPatches();
  private labels = new Map<HTMLElement, HTMLElement>();

  sync(root: HTMLElement) {
    for (const [control, label] of this.labels) if (!control.isConnected || !root.contains(control) || mediaControl(control) || control.closest(selectors.expressionPicker)) {
      label.remove();
      this.patches.reset(control, 'data-sc-text-control');
      this.labels.delete(control);
    }
    for (const control of allNative<HTMLElement>(root, `button[aria-label], [role="button"][aria-label], [role="menuitem"] [aria-label], [data-sc-form] [aria-label], [role="button"][class*="reactionBtn_"], [class*="panels_"] button[aria-describedby], [class*="panels_"] [class*="clickablePing_"], ${formIconControl}`)) {
      if (control.closest('[data-sc-guilds], [data-sc-sidebar] a, [contenteditable="true"]')) continue;
      if (mediaControl(control)) continue;
      if (control.closest(selectors.expressionPicker)) continue;
      const nativeText = [...control.childNodes].filter(node => !isOwned(node)).map(node => node.textContent).join('').trim();
      const accountControl = control.matches('[class*="accountPopoutButton_"]');
      if (!accountControl && (nativeText || !control.querySelector('svg, img, [class*="spriteContainer_"]'))) continue;
      const label = this.labels.get(control) ?? owned('span', 'sc-control-label');
      const description = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).map(id => control.ownerDocument.getElementById(id)?.textContent ?? '').join(' ').trim();
      const iconLabel = control.matches(formIconControl) ? control.querySelector('svg[aria-hidden="false"][aria-label]')?.getAttribute('aria-label') : null;
      const raw = control.getAttribute('aria-label') ?? iconLabel ?? (control.matches('[class*="reactionBtn_"]') ? '반응 추가' : description);
      if (!raw) continue;
      const value = raw.replace(/^메시지 보내기 .+$/, '대화').replace(/^기타 options for .+$/, '기타')
        .replace('더 많은 메시지 옵션', '첨부').replace('GIF 선택기 열기', 'GIF').replace('스티커 선택기 열기', '스티커')
        .replace('서버에 초대하기', '초대').replace('채널 만들기', '+').replace('프로필 및 상태 관리', '프로필 · 상태')
        .replace('Krisp가 제공하는 잡음 제거', '잡음 제거').replace('화면 공유하기', '화면 공유').replace('활동 시작하기', '활동').replace('사운드보드 열기', '사운드보드')
        .replace('헤드셋 음소거', '듣기').replace('사용자 설정', '설정').replace('입력 옵션', '입력').replace('출력 옵션', '출력').replace('반응 추가: ', ':');
      if (label.textContent !== value) label.textContent = value;
      if (label.parentElement !== control) control.append(label);
      this.labels.set(control, label);
      this.patches.set(control, 'data-sc-text-control');
    }
    this.patches.prune();
  }

  /** Small text containers also cover statuses, profile dialogs, menus and embeds. */
  emojiSources(root: HTMLElement): HTMLElement[] {
    const sources = new Set<HTMLElement>();
    const pattern = emojiRegex();
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      pattern.lastIndex = 0;
      if (!pattern.test(node.textContent ?? '')) continue;
      const element = node.parentElement;
      if (!element || sources.has(element) || isOwned(element)) continue;
      if (element.closest('[data-sc-picker-label]')) continue;
      if (element.closest('script, style, textarea, input, [contenteditable="true"], [data-sc-guilds]')) continue;
      if (element.querySelector('input, textarea, select, [contenteditable="true"]')) continue;
      sources.add(element);
    }
    return [...sources];
  }

  clear() {
    for (const label of this.labels.values()) label.remove();
    this.labels.clear();
    this.patches.restore();
  }
}
