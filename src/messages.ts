import { selectors } from './adapter';
import { allNative, DomPatches, owned } from './dom';
import { emojiText } from './emoji';

export class MessageGrid {
  private authorPatches = new DomPatches();
  private authorControls = new Set<HTMLElement>();
  private threadCards = new Set<HTMLElement>();
  private gutters = new Map<HTMLElement, HTMLElement>();
  private compactTimes = new Map<HTMLElement, HTMLElement>();
  private emptyCells = new Map<HTMLElement, HTMLElement[]>();
  private ordinal = new Map<string, number>();
  private route = '';

  sync(rows: HTMLElement[], route: string, showEmoji = true) {
    if (this.route !== route) { this.clear(); this.route = route; }
    const currentAuthors = new Set<HTMLElement>();
    const currentThreads = new Set<HTMLElement>();
    for (const row of rows) for (const card of allNative<HTMLElement>(row, selectors.threadCard)) {
      currentThreads.add(card);
      this.authorPatches.set(card, 'data-sc-thread-card');
    }
    for (const row of rows) for (const name of allNative<HTMLElement>(row, selectors.threadName)) {
      const card = name.closest<HTMLElement>('[class*="threadMessageAccessory_"], [class*="container_"]');
      if (card && card !== row && row.contains(card) && !card.querySelector(selectors.row)) {
        currentThreads.add(card);
        this.authorPatches.set(card, 'data-sc-thread-card');
      }
    }
    for (const old of this.threadCards) if (!currentThreads.has(old)) this.authorPatches.reset(old, 'data-sc-thread-card');
    this.threadCards = currentThreads;
    for (const [row, gutter] of this.gutters) if (!row.isConnected || !rows.includes(row)) {
      gutter.remove();
      this.compactTimes.get(row)?.remove();
      this.compactTimes.delete(row);
      this.emptyCells.get(row)?.forEach(cell => cell.remove());
      this.emptyCells.delete(row);
      row.removeAttribute('data-sc-row');
      this.gutters.delete(row);
    }
    let previousAuthor = '';
    let previousTime = '';
    let previousMinute = '';
    const minutes: { row: HTMLElement; key: string; time: string }[] = [];
    for (const row of rows) {
      row.dataset.scRow = '';
      const key = row.id || row.getAttribute('data-list-item-id') || '';
      if (!this.ordinal.has(key)) this.ordinal.set(key, this.ordinal.size + 1);
      let gutter = this.gutters.get(row);
      if (!gutter) {
        gutter = owned('div', 'sc-row-gutter');
        gutter.setAttribute('aria-hidden', 'true');
        this.gutters.set(row, gutter);
      }
      const metadata = <T extends HTMLElement>(selector: string) => allNative<T>(row, selector).find(node =>
        !node.closest(`${selectors.visuallyHidden}, [data-sc-thread-card], [class*="repliedMessage_"], [class*="messageSnapshot_"]`)
        && (node.closest(selectors.row) === row || node.closest(selectors.row)?.parentElement === row));
      const authorNode = metadata<HTMLElement>(selectors.author);
      const timeNode = metadata<HTMLTimeElement>('time');
      const authorName = authorNode?.querySelector<HTMLElement>('[class*="username_"]') ?? authorNode;
      if (authorName?.matches('[role="button"]') && authorName.closest('[class*="header_"]')) {
        currentAuthors.add(authorName);
        this.authorPatches.set(authorName, 'data-sc-author-control');
      }
      const author = authorName?.textContent?.trim() || previousAuthor || '—';
      const datetime = timeNode?.getAttribute('datetime');
      const date = datetime ? new Date(datetime) : null;
      const time = date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
        : timeNode?.textContent?.trim() || previousTime || '—';
      const minute = date && !Number.isNaN(date.getTime()) ? String(Math.floor(date.getTime() / 60000))
        : timeNode ? time : previousMinute;
      minutes.push({ row, key: minute, time });
      previousMinute = minute;
      previousAuthor = author;
      previousTime = time;
      // Ordinals are local display references, never Discord message positions.
      const values = [String(this.ordinal.get(key)), time, showEmoji ? author : emojiText(author)];
      const signature = JSON.stringify(values);
      if (gutter.dataset.signature !== signature) {
        gutter.dataset.signature = signature;
        gutter.replaceChildren(...values.map((value, index) => {
          const cell = owned('span', ['sc-row-number', 'sc-row-time', 'sc-row-author'][index]);
          cell.textContent = value;
          cell.title = value;
          return cell;
        }));
      }
      if (!gutter.isConnected || gutter.parentElement !== row) row.prepend(gutter);
      let blanks = this.emptyCells.get(row);
      if (!blanks) {
        blanks = ['D', 'E', 'F', 'G', 'H'].map(column => {
          const cell = owned('span', 'sc-empty-cell');
          cell.dataset.scColumn = column;
          cell.setAttribute('aria-hidden', 'true');
          return cell;
        });
        this.emptyCells.set(row, blanks);
      }
      for (const cell of blanks) if (cell.parentElement !== row) row.append(cell);
    }
    for (const old of this.authorControls) if (!currentAuthors.has(old)) this.authorPatches.reset(old, 'data-sc-author-control');
    this.authorControls = currentAuthors;
    this.authorPatches.prune();
    // Put one minute label below the last rendered message in each minute group.
    // Recompute after prepends, deletions and virtual-list recycling.
    minutes.forEach(({ row, key, time }, index) => {
      let footer = this.compactTimes.get(row);
      if (!footer) {
        footer = owned('div', 'sc-compact-time');
        this.compactTimes.set(row, footer);
      }
      footer.hidden = !key || minutes[index + 1]?.key === key;
      if (footer.textContent !== time) footer.textContent = time;
      if (footer.parentElement !== row || row.lastElementChild !== footer) row.append(footer);
    });
  }

  clear() {
    this.authorPatches.restore();
    this.authorControls.clear();
    this.threadCards.clear();
    for (const [row, gutter] of this.gutters) { row.removeAttribute('data-sc-row'); gutter.remove(); }
    this.gutters.clear();
    for (const footer of this.compactTimes.values()) footer.remove();
    this.compactTimes.clear();
    for (const cells of this.emptyCells.values()) cells.forEach(cell => cell.remove());
    this.emptyCells.clear();
    this.ordinal.clear();
  }
}
