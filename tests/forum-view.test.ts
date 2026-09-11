import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { ForumView } from '../src/forum-view';
import { fixtureMarkup } from './fixture';
import { addForumViewFixture } from './forum-view-fixture';

let view: ForumView;
const root = () => document.querySelector<HTMLElement>('#app-mount')!;
beforeEach(() => { document.body.innerHTML = fixtureMarkup(); history.replaceState(null, '', '/channels/100/1000'); view = new ForumView(); });
afterEach(() => { view.clear(); document.body.replaceChildren(); document.head.replaceChildren(); vi.useRealTimers(); });

it('selects the native list once, restores focus, and selects again after reload or channel re-entry', async () => {
  const native = addForumViewFixture(10);
  const focused = document.createElement('button'); document.body.append(focused); focused.focus();
  view.sync(root(), location.pathname);
  await vi.waitFor(() => expect(native.choices()).toBe(1));
  expect(document.activeElement).toBe(focused);
  expect(document.querySelector('#sort-and-view')).toBeNull();
  expect(document.documentElement.hasAttribute('data-sc-forum-switching')).toBe(false);
  native.gallery(); view.sync(root(), location.pathname);
  expect(native.opens()).toBe(1); // Respect a manual gallery choice during this visit.
  view.clear(); view.sync(root(), location.pathname);
  await vi.waitFor(() => expect(native.choices()).toBe(2));
  history.replaceState(null, '', '/channels/100/1001'); view.sync(root(), location.pathname);
  native.gallery(); history.replaceState(null, '', '/channels/100/1000'); view.sync(root(), location.pathname);
  await vi.waitFor(() => expect(native.choices()).toBe(3));
});

it('waits while the user edits or another menu is open and leaves draft text untouched', () => {
  const native = addForumViewFixture();
  const input = document.createElement('textarea'); input.value = '한글 조합 중'; document.body.append(input); input.focus();
  view.sync(root(), location.pathname); expect(native.opens()).toBe(0);
  input.blur(); const menu = document.createElement('div'); menu.setAttribute('role', 'menu'); document.body.append(menu);
  view.sync(root(), location.pathname); expect(native.opens()).toBe(0);
  menu.remove(); view.sync(root(), location.pathname);
  expect(native.choices()).toBe(1); expect(input.value).toBe('한글 조합 중');
});

it('does not override an existing list or a manually opened view menu', () => {
  const native = addForumViewFixture(); native.opener.click();
  view.sync(root(), location.pathname);
  document.querySelector<HTMLElement>('#sort-and-view-view-as-grid')!.click();
  view.sync(root(), location.pathname); expect(native.choices()).toBe(0); expect(native.opens()).toBe(1);
  view.clear(); native.opener.click(); document.querySelector<HTMLElement>('#sort-and-view-view-as-list')!.click();
  view.sync(root(), location.pathname); native.gallery(); view.sync(root(), location.pathname);
  expect(native.opens()).toBe(2);
});

it('stops on missing menu structure without repeatedly opening menus or hiding the page', () => {
  vi.useFakeTimers(); const warning = vi.fn(); view = new ForumView(warning);
  const native = addForumViewFixture();
  native.opener.addEventListener('click', () => { document.querySelector('#sort-and-view-view-as-list')!.remove(); });
  view.sync(root(), location.pathname);
  expect(warning).toHaveBeenCalledTimes(1);
  expect(document.querySelector('#sort-and-view')).toBeNull();
  expect(document.documentElement.hasAttribute('data-sc-forum-switching')).toBe(false);
  view.sync(root(), location.pathname); vi.runAllTimers(); expect(native.opens()).toBe(1);
});

it('cancels pending work on disable or navigation before a delayed menu can select anything', async () => {
  const native = addForumViewFixture(10);
  view.sync(root(), location.pathname); view.clear();
  await new Promise(resolve => setTimeout(resolve, 30));
  expect(native.choices()).toBe(0);
  expect(document.querySelector('#sort-and-view')).toBeNull();
  expect(document.documentElement.hasAttribute('data-sc-forum-switching')).toBe(false);
  document.querySelector('#sort-and-view')?.remove();
  native.opener.setAttribute('aria-expanded', 'false');
  view.sync(root(), location.pathname);
  history.replaceState(null, '', '/channels/100/9999');
  await new Promise(resolve => setTimeout(resolve, 30));
  expect(native.choices()).toBe(0); expect(document.querySelector('#sort-and-view')).toBeNull();
});

it('times out if the native view does not change and does not retry on incoming messages', () => {
  vi.useFakeTimers(); const warning = vi.fn(); view = new ForumView(warning);
  const native = addForumViewFixture();
  native.opener.addEventListener('click', () => { document.querySelector('#sort-and-view-view-as-list')!.addEventListener('click', () => native.gallery()); });
  view.sync(root(), location.pathname); vi.advanceTimersByTime(2000);
  expect(warning).toHaveBeenCalledTimes(1); expect(document.documentElement.hasAttribute('data-sc-forum-switching')).toBe(false);
  view.sync(root(), location.pathname); expect(native.opens()).toBe(1);
});
