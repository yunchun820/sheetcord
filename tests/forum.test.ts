import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SheetcordController } from '../src/controller';
import { DiscordAdapter, selectors } from '../src/adapter';
import { MediaController } from '../src/media';
import { defaults } from '../src/settings';
import { fixtureMarkup } from './fixture';
import { addForumFixture, forumCardMarkup } from './forum-fixture';

let controller: SheetcordController | undefined;
const posts = () => [...document.querySelectorAll<HTMLElement>(selectors.forumCard)];
beforeEach(() => {
  document.body.innerHTML = fixtureMarkup();
  history.replaceState(null, '', '/channels/100/1000');
  addForumFixture();
});
afterEach(() => { controller?.destroy(); controller = undefined; document.body.replaceChildren(); document.head.replaceChildren(); });
async function start(showEmoji = false) {
  controller = new SheetcordController({ read: async () => ({ ...defaults, showEmoji }), write: async () => {}, subscribe: () => () => {} });
  await controller.start();
  await vi.waitFor(() => expect(document.querySelectorAll('.sc-media-toggle')).toHaveLength(3));
}

it('formats forum media and zero-count reactions without treating posts as message rows, then restores the DOM', async () => {
  const before = document.querySelector('#app-mount')!.innerHTML;
  const original = posts()[0].querySelector<HTMLElement>('.reactionInner_fixture')!;
  const clicked = vi.fn(); original.addEventListener('click', clicked);
  await start();
  expect(posts()).toHaveLength(3);
  expect(new DiscordAdapter().rows(new DiscordAdapter().discover()!)).toHaveLength(0);
  expect(document.querySelector('[data-sc-row]')).toBeNull();
  const proxy = posts()[0].querySelector<HTMLElement>('[data-sc-emoji-proxy]')!;
  expect(proxy.textContent).toContain(':skull:');
  expect(proxy.textContent).not.toContain('눌러서');
  proxy.querySelector<HTMLElement>('.sc-emoji-name')!.click();
  expect(clicked).toHaveBeenCalledTimes(1);
  expect(posts()[1].querySelector('[data-sc-emoji-proxy]')?.textContent).toContain('2');
  controller!.destroy(); controller = undefined;
  expect(document.querySelector('#app-mount')!.innerHTML).toBe(before);
});

it('keeps original emoji artwork and native reaction handlers when emoji display is enabled', async () => {
  await start(true);
  expect(posts()[0].querySelector('[data-sc-emoji-proxy]')).toBeNull();
  expect(posts()[0].querySelector('.reactionInner_fixture')?.textContent).not.toContain('눌러서');
  expect(posts()[0].querySelector('img.emoji')?.getAttribute('alt')).toBe('💀');
});

it('keeps native gallery geometry and avoids expandable media inside absolute cards', async () => {
  document.querySelector('[data-list-id="chat-messages"]')!.insertAdjacentHTML('beforeend', '<li class="mainCard_gallery" style="position:absolute;top:500px;height:373px"><div data-grid-item-id="forum-grid-view___card-1-2200"></div><div class="imageWrapper_fixture" style="height:250px"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="합성 이미지"></div></li>');
  const gallery = document.querySelector<HTMLElement>('.mainCard_gallery')!;
  const original = gallery.outerHTML;
  await start();
  expect(posts()).toHaveLength(4);
  expect(gallery.querySelector('.sc-media-toggle')).toBeNull();
  expect(gallery.outerHTML).toBe(original);
});

it('isolates expansion by post ID across virtual card replacement and restores wrappers', () => {
  const media = new MediaController();
  media.sync(posts(), location.pathname);
  const loadingPost = posts()[2];
  loadingPost.querySelector<HTMLButtonElement>('.sc-media-toggle')!.click();
  expect(loadingPost.querySelector('[data-sc-media="expanded"]')).not.toBeNull();
  loadingPost.querySelector('.loadingOverlay_fixture')!.innerHTML = '<img alt="늦게 로딩한 이미지" width="400" height="167">';
  media.sync(posts(), location.pathname);
  expect(loadingPost.querySelector('[data-sc-media="expanded"]')).not.toBeNull();
  expect(loadingPost.querySelectorAll('.sc-media-toggle')).toHaveLength(1);
  posts()[0].querySelector<HTMLButtonElement>('.sc-media-toggle')!.click();
  expect(posts()[0].querySelector('[data-sc-media="expanded"]')).not.toBeNull();
  expect(posts()[1].querySelector('[data-sc-media="collapsed"]')).not.toBeNull();
  posts()[0].parentElement!.outerHTML = forumCardMarkup(2100);
  media.sync(posts(), location.pathname);
  expect(posts()[0].querySelector('[data-sc-media="expanded"]')).not.toBeNull();
  posts()[0].parentElement!.outerHTML = forumCardMarkup(2110);
  media.sync(posts(), location.pathname);
  expect(posts()[0].querySelector('[data-sc-media="collapsed"]')).not.toBeNull();
  expect(document.querySelector('.messages-scroller')?.hasAttribute('data-sc-media-layout')).toBe(false);
  media.clear();
  expect(document.querySelector('[data-sc-media-layout], [data-sc-media], .sc-media-toggle')).toBeNull();
});

it('opens native channel actions from View and closes competing navigation menus', async () => {
  const native = document.querySelector<HTMLElement>('.toolbar_fixture > [role="button"]')!;
  const click = vi.fn(); native.addEventListener('click', click);
  await start();
  const opener = [...document.querySelectorAll<HTMLButtonElement>('.sc-navigation-toggle')].find(button => button.textContent === '보기')!;
  opener.click();
  expect(document.querySelectorAll('.sc-navigation-item')).toHaveLength(2);
  document.querySelector<HTMLButtonElement>('.sc-navigation-item')!.click();
  expect(click).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.sc-navigation-panel')).toBeNull();
  opener.click();
  [...document.querySelectorAll<HTMLButtonElement>('.sc-navigation-toggle')].find(button => button.textContent === '파일')!.click();
  expect(document.querySelectorAll('.sc-navigation-panel')).toHaveLength(1);
  expect(opener.getAttribute('aria-expanded')).toBe('false');
});
