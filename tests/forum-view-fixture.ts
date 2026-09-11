import { addForumFixture, forumCardMarkup } from './forum-fixture';

/** Native menu/list replacement simulation, including delayed mounting. */
export function addForumViewFixture(delay = 0) {
  addForumFixture();
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  const cards = document.createElement('div');
  [...list.children].filter(e => e.matches('li')).forEach(e => e.remove());
  cards.className = 'forum-view-cards';
  list.append(cards);
  const gallery = () => { cards.innerHTML = '<li class="mainCard_gallery" style="height:373px"><div data-grid-item-id="forum-grid-view___card-1-2100" role="gridcell">작업 노트</div></li>'; };
  gallery();
  const opener = document.createElement('button');
  opener.className = 'sortDropdown_fixture'; opener.textContent = '정렬 및 보기';
  opener.setAttribute('aria-label', '정렬 및 보기'); opener.setAttribute('aria-expanded', 'false');
  list.querySelector('.headerRow_fixture')!.append(opener);
  let opens = 0; let choices = 0;
  const open = () => {
    opens++;
    const mount = () => {
      const menu = document.createElement('div'); menu.id = 'sort-and-view'; menu.setAttribute('role', 'menu'); menu.tabIndex = -1;
      menu.innerHTML = '<div role="menuitemradio" aria-checked="false" id="sort-and-view-view-as-list">목록</div><div role="menuitemradio" aria-checked="true" id="sort-and-view-view-as-grid">갤러리</div>';
      const close = () => { menu.remove(); opener.setAttribute('aria-expanded', 'false'); };
      menu.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
      menu.querySelector('#sort-and-view-view-as-list')!.addEventListener('click', () => { choices++; cards.innerHTML = forumCardMarkup(2100); close(); });
      menu.querySelector('#sort-and-view-view-as-grid')!.addEventListener('click', () => { gallery(); close(); });
      document.querySelector('#app-mount')!.append(menu); menu.focus();
    };
    opener.setAttribute('aria-expanded', 'true');
    if (delay) window.setTimeout(mount, delay); else mount();
  };
  opener.addEventListener('click', open);
  return { opener, gallery, opens: () => opens, choices: () => choices };
}
