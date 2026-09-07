import type { GuildTab } from './adapter';
import { button, owned } from './dom';
import type { Settings } from './settings';

interface Actions {
  update(patch: Partial<Settings>): void;
  collapseImages(): void;
  search(): void;
}

function text(tag: 'span' | 'div' | 'strong', value: string, className = '') {
  const node = owned(tag, className);
  node.textContent = value;
  return node;
}

export class WorkbookShell {
  readonly header = owned('header', 'sc-header');
  readonly bottom = owned('footer', 'sc-bottom');
  private sheets = owned('div', 'sc-sheets');
  private title = text('span', '대화', 'sc-workbook-name');
  private status = text('span', '준비', 'sc-status-message');
  private emojiButton: HTMLButtonElement;
  private sidebarButton: HTMLButtonElement;
  private tabSignature = '';
  private tabSources = new Map<string, HTMLElement>();
  private columnCorner = text('span', '채널', 'sc-column-corner');
  private formulaHint = text('span', '대화를 선택하면 메시지 입력줄이 나타납니다.', 'sc-formula-hint');
  private help: HTMLElement | null = null;
  private statusTimer = 0;

  constructor(private actions: Actions) {
    this.header.setAttribute('aria-label', 'Sheetcord 도구 모음');
    const titlebar = owned('div', 'sc-titlebar');
    const logo = text('span', 'S', 'sc-logo');
    logo.setAttribute('aria-hidden', 'true');
    titlebar.append(logo, text('strong', 'Sheetcord', 'sc-brand'), text('span', '│', 'sc-title-separator'), this.title,
      text('span', '• 디스코드 웹', 'sc-connected'));
    const menu = owned('div', 'sc-menubar');
    // Familiar ribbon labels are visual headings, not pretend file-editing controls.
    for (const [index, label] of ['파일', '홈', '삽입', '페이지 레이아웃', '수식', '데이터', '검토', '보기'].entries()) {
      const item = text('span', label, `sc-menu-label${index === 1 ? ' is-active' : ''}`);
      item.setAttribute('aria-hidden', 'true');
      menu.append(item);
    }
    menu.append(button('사용 안내', () => this.toggleHelp(), 'sc-help-link'));
    const ribbon = owned('div', 'sc-ribbon');
    const group = (label: string, controls: HTMLElement[]) => {
      const node = owned('div', 'sc-ribbon-group');
      const items = owned('div', 'sc-ribbon-items');
      items.append(...controls);
      node.append(items, text('span', label, 'sc-group-label'));
      ribbon.append(node);
    };
    const tool = (icon: string, label: string, action: () => void, large = false) => {
      const control = button('', action, `sc-tool${large ? ' sc-tool-large' : ''}`);
      const symbol = text('span', icon, 'sc-tool-icon');
      symbol.setAttribute('aria-hidden', 'true');
      control.append(symbol, text('span', label));
      return control;
    };
    group('화면', [tool('▦', '원래 화면', () => actions.update({ enabled: false }), true)]);
    this.emojiButton = tool('☺', '이모지 표시', () => actions.update({ showEmoji: this.emojiButton.getAttribute('aria-pressed') !== 'true' }));
    group('콘텐츠 표시', [this.emojiButton, tool('▧', '이미지 모두 접기', () => actions.collapseImages())]);
    this.sidebarButton = tool('◧', '채널 목록', () => actions.update({ sidebarCollapsed: this.sidebarButton.getAttribute('aria-pressed') === 'true' }));
    group('작업 창', [this.sidebarButton, tool('⌕', '대화 검색', () => actions.search())]);
    const info = owned('div', 'sc-ribbon-note');
    info.append(text('strong', '대화가 놓이는 새로운 셀.'), text('span', '아래 시트로 서버를 이동하세요.'));
    ribbon.append(info);

    const formula = owned('div', 'sc-formula');
    const nameBox = text('span', 'C · 입력', 'sc-name-box');
    const fx = text('span', 'ƒx', 'sc-fx');
    fx.setAttribute('aria-hidden', 'true');
    formula.append(nameBox, fx, this.formulaHint);
    const columns = owned('div', 'sc-columns');
    columns.setAttribute('aria-hidden', 'true');
    columns.append(this.columnCorner, text('span', '◢', 'sc-column-number'), text('span', 'A · 시간', 'sc-column-time'),
      text('span', 'B · 작성자', 'sc-column-author'));
    const messageColumns = owned('div', 'sc-column-message');
    for (const letter of ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']) messageColumns.append(text('span', letter));
    columns.append(messageColumns);
    this.header.append(titlebar, menu, ribbon, formula, columns);

    const sheetbar = owned('div', 'sc-sheetbar');
    const arrows = owned('div', 'sc-sheet-arrows');
    const left = button('‹', () => this.sheets.scrollBy({ left: -240, behavior: 'smooth' }));
    left.setAttribute('aria-label', '이전 서버 탭 보기');
    const right = button('›', () => this.sheets.scrollBy({ left: 240, behavior: 'smooth' }));
    right.setAttribute('aria-label', '다음 서버 탭 보기');
    arrows.append(left, right);
    this.sheets.setAttribute('role', 'tablist');
    this.sheets.setAttribute('aria-label', '디스코드 서버 시트');
    this.sheets.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...this.sheets.querySelectorAll<HTMLElement>('[role="tab"]')];
      const current = tabs.indexOf(document.activeElement as HTMLElement);
      let next = current;
      if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      event.preventDefault();
      tabs[next]?.focus();
    });
    sheetbar.append(arrows, this.sheets, text('span', 'Sheetcord', 'sc-sheet-brand'));
    const statusbar = owned('div', 'sc-statusbar');
    statusbar.append(text('span', '✓', 'sc-ready-mark'), this.status,
      text('span', '표시 전용  ·  100%', 'sc-status-right'));
    this.bottom.append(sheetbar, statusbar);
  }

  mount() { document.body.append(this.header, this.bottom); }

  render(settings: Settings, tabs: GuildTab[], channel: string, hasEditor: boolean) {
    this.emojiButton.setAttribute('aria-pressed', String(settings.showEmoji));
    this.sidebarButton.setAttribute('aria-pressed', String(!settings.sidebarCollapsed));
    this.title.textContent = `${channel} — 커뮤니케이션.xlsx`;
    this.columnCorner.textContent = location.pathname.startsWith('/channels/@me') ? '개인 메시지' : '채널';
    this.formulaHint.hidden = hasEditor;
    this.tabSources = new Map(tabs.map(tab => [tab.key, tab.source]));
    const signature = JSON.stringify(tabs.map(({ source: _source, ...tab }) => tab));
    if (signature === this.tabSignature) return;
    this.tabSignature = signature;
    const previousScroll = this.sheets.scrollLeft;
    const focusedKey = (document.activeElement as HTMLElement)?.dataset.scTab;
    const children: HTMLElement[] = [];
    if (!tabs.some(tab => tab.key === '@me')) {
      const home = owned('a', 'sc-sheet');
      home.href = '/channels/@me';
      home.textContent = '개인 메시지';
      home.setAttribute('role', 'tab');
      home.setAttribute('aria-selected', String(location.pathname.startsWith('/channels/@me')));
      children.push(home);
    }
    for (const tab of tabs) {
      const control = button('', () => this.tabSources.get(tab.key)?.click(), 'sc-sheet');
      control.dataset.scTab = tab.key;
      control.setAttribute('role', 'tab');
      control.setAttribute('aria-selected', String(tab.selected));
      control.title = tab.label;
      control.append(text('span', `${tab.folder ? '▸ ' : ''}${tab.label}`, 'sc-sheet-label'));
      if (tab.unread) {
        const dot = text('span', '•', 'sc-unread-dot');
        dot.setAttribute('aria-label', '읽지 않은 메시지');
        control.append(dot);
      }
      children.push(control);
    }
    this.sheets.replaceChildren(...children);
    this.sheets.scrollLeft = previousScroll;
    if (focusedKey) children.find(child => child.dataset.scTab === focusedKey)?.focus({ preventScroll: true });
  }

  message(value: string) {
    clearTimeout(this.statusTimer);
    this.status.textContent = value;
    this.statusTimer = window.setTimeout(() => { this.status.textContent = '준비'; }, 6000);
  }

  private toggleHelp() {
    if (this.help) { this.help.remove(); this.help = null; return; }
    const panel = owned('section', 'sc-help-panel');
    panel.setAttribute('aria-label', 'Sheetcord 사용 안내');
    panel.append(text('strong', 'Sheetcord 사용 안내'));
    for (const line of [
      '아래 시트: 서버 이동 · 첫 시트: 개인 메시지',
      '왼쪽 목록: 채널 선택 · 상단 입력줄: 메시지 작성',
      'Enter로 전송, Shift+Enter로 줄바꿈합니다.',
      '이미지는 개별적으로 펼칠 수 있습니다. 스포일러 공개는 별도입니다.',
      '이모지를 끄면 이름이나 문자 코드로 표시합니다.',
      '행 번호는 현재 세션의 표시 번호입니다. 서버의 메시지 번호가 아닙니다.',
      '원래 화면으로 돌아간 뒤에는 확장 아이콘에서 다시 켤 수 있습니다.',
    ]) panel.append(text('div', line));
    panel.append(button('닫기', () => this.toggleHelp()));
    document.body.append(panel);
    this.help = panel;
  }

  destroy() {
    clearTimeout(this.statusTimer);
    this.header.remove();
    this.bottom.remove();
    this.help?.remove();
  }
}
