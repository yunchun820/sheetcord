import { afterEach, expect, it } from 'vitest';
import { MessageGrid } from '../src/messages';
import { fixtureMarkup } from './fixture';
import { addAttachmentActionsFixture } from './media-display-fixture';

afterEach(() => document.body.replaceChildren());

it('collapses edited metadata-only content, restores it when text arrives, and preserves native markup', () => {
  document.body.innerHTML = fixtureMarkup();
  const list = addAttachmentActionsFixture();
  const row = list.querySelector<HTMLElement>('li')!;
  const content = row.querySelector<HTMLElement>('[id^="message-content-"]')!;
  const before = row.innerHTML;
  const grid = new MessageGrid();
  grid.sync([row], 'route');
  expect(content.hasAttribute('data-sc-empty-content')).toBe(true);
  const text = document.createTextNode('실제 메시지');
  content.prepend(text);
  grid.sync([row], 'route');
  expect(content.hasAttribute('data-sc-empty-content')).toBe(false);
  text.remove();
  const link = document.createElement('a'); link.textContent = '링크'; content.prepend(link);
  grid.sync([row], 'route');
  expect(content.hasAttribute('data-sc-empty-content')).toBe(false);
  link.remove(); grid.sync([row], 'route'); grid.clear();
  expect(row.innerHTML).toBe(before);
});
