/** A nested dark navigation + sibling account panel, independent of live Discord. */
export function addDarkSidebarFixture() {
  const navigation = document.querySelector<HTMLElement>('.sidebarList_fixture')!;
  if (navigation.closest('.sidebar_fixture')) return;
  const column = document.createElement('aside');
  column.className = 'sidebar_fixture';
  navigation.before(column);
  column.append(navigation);
  const container = document.createElement('div');
  container.className = 'container_nested theme-dark';
  const scroller = document.createElement('div');
  scroller.className = 'scroller_nested';
  const account = navigation.querySelector<HTMLElement>('.sidebar-footnote')!;
  const panels = document.createElement('section');
  panels.className = 'panels_fixture theme-dark';
  panels.append(account);
  scroller.append(...navigation.childNodes);
  container.append(scroller);
  navigation.append(container);
  column.append(panels);
  for (const link of navigation.querySelectorAll('a.channel-link')) {
    link.querySelector('span')?.classList.add('name_fixture');
    const line = document.createElement('div');
    line.className = 'linkTop_fixture';
    line.append(...link.childNodes);
    link.append(line);
  }
  navigation.querySelector('[aria-current="page"] .name_fixture')!.textContent = '규칙-rules';
  navigation.querySelector('[href$="1003"] .name_fixture')!.textContent = '📣 공지-announcements-중요한소식과업데이트';
  const style = document.createElement('style');
  style.textContent = `
    .sidebar_fixture { display:flex; flex-direction:column; width:240px; min-height:0; flex-shrink:0; background:#000; }
    .sidebar_fixture .sidebarList_fixture { flex:1; min-height:0; padding:0; }
    .sidebar_fixture .container_nested { height:100%; }
    .sidebar_fixture .scroller_nested { height:100%; overflow-y:auto; padding:0 10px; }
    .sidebar_fixture .theme-dark { --text-normal:#fff; --channels-default:#eee; background:#000; color:#fff; }
    .sidebar_fixture .scroller_nested { background:#000; }
    .sidebar_fixture .channel-link { height:32px; }
    .sidebar_fixture .linkTop_fixture { display:flex; align-items:center; gap:10px; height:32px; width:100%; }
    .sidebar_fixture .channel-link .name_fixture { color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .sidebar_fixture .channel-link[aria-current="page"] .name_fixture { color:#fff; }
    .sidebar_fixture .panels_fixture { flex-shrink:0; background:#000; }
    .sidebar_fixture .sidebar-footnote { margin:0; padding:12px; }
    .sidebar_fixture .sidebar-footnote strong { color:var(--text-normal); }
  `;
  document.head.append(style);
}
