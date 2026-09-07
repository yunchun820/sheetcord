import { selectors } from './adapter';
import { owned, queryNative } from './dom';

export class MessageGrid {
  private gutters = new Map<HTMLElement, HTMLElement>();
  private ordinal = new Map<string, number>();
  private route = '';

  sync(rows: HTMLElement[], route: string) {
    if (this.route !== route) { this.clear(); this.route = route; }
    for (const [row, gutter] of this.gutters) if (!row.isConnected || !rows.includes(row)) {
      gutter.remove();
      row.removeAttribute('data-sc-row');
      this.gutters.delete(row);
    }
    let previousAuthor = '';
    let previousTime = '';
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
      const authorNode = queryNative<HTMLElement>(row, selectors.author);
      const timeNode = queryNative<HTMLTimeElement>(row, 'time');
      const author = authorNode?.textContent?.trim() || previousAuthor || '—';
      const datetime = timeNode?.getAttribute('datetime');
      const date = datetime ? new Date(datetime) : null;
      const time = date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
        : timeNode?.textContent?.trim() || previousTime || '—';
      previousAuthor = author;
      previousTime = time;
      // Ordinals are local display references, never Discord message positions.
      const values = [String(this.ordinal.get(key)), time, author];
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
    }
  }

  clear() {
    for (const [row, gutter] of this.gutters) { row.removeAttribute('data-sc-row'); gutter.remove(); }
    this.gutters.clear();
    this.ordinal.clear();
  }
}
