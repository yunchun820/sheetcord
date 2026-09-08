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

export function addSidebarThreadsFixture() {
  const navigation = document.querySelector<HTMLElement>('.sidebarList_fixture')!;
  const heading = navigation.querySelector('.workspace-heading')!;
  const account = navigation.querySelector('.sidebar-footnote')!;
  navigation.replaceChildren(heading, account);
  for (const [index, label] of ['자료 모음', '일반'].entries()) {
    const section = document.createElement('div');
    section.innerHTML = `<a class="channel-link link_fixture" href="/channels/100/${1000 + index}"><span class="name_fixture">${label}</span></a>
      <ul role="group" aria-label="${label} 스레드"><div class="spineBorder_fixture"></div>${['주간 작업 기록', '긴 제목의 포스트가 옆으로 잘리지 않고 자연스러운 말줄임표로 표시되는지 확인합니다', '읽지 않은 항목'].map((name, i) => `
        <li class="containerDefault_fixture"><svg class="spine_fixture" width="10" height="19"></svg><div class="wrapper_fixture typeThread_fixture ${i === 0 ? 'modeSelected_fixture' : i === 2 ? 'modeUnread_fixture' : ''}">
          <div class="link_fixture" role="button" tabindex="0" aria-label="${name} (스레드)" data-list-item-id="channels___${1100 + index * 10 + i}"><div class="linkTop_fixture"><div class="name_fixture"><div data-text-variant="text-sm/medium">${name}</div></div><div class="children_fixture"></div></div></div>
        </div></li>`).join('')}</ul>`;
    account.before(section);
  }
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  status.textContent = '선택 전'; account.before(status);
  navigation.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-list-item-id]');
    if (!target) return;
    navigation.querySelectorAll('.modeSelected_fixture').forEach(e => e.classList.remove('modeSelected_fixture'));
    target.parentElement!.classList.add('modeSelected_fixture');
    status.textContent = target.getAttribute('aria-label');
  });
  const style = document.createElement('style');
  style.textContent = `.sidebarList_fixture ul{list-style:none;padding:0;margin:0;position:relative}
    .sidebarList_fixture .spineBorder_fixture{position:absolute;left:24px;top:0;bottom:24px;border-left:2px solid #444}
    .sidebarList_fixture .containerDefault_fixture{height:30px;position:relative}
    .sidebarList_fixture .spine_fixture{position:absolute;left:24px}
    .sidebarList_fixture .typeThread_fixture{margin-left:36px;padding:1px 0}
    .sidebarList_fixture .typeThread_fixture>.link_fixture{display:flex;flex-direction:column;align-items:center;height:28px;padding:4px 8px}
    .sidebarList_fixture .linkTop_fixture{display:flex;width:100%}
    .sidebarList_fixture .name_fixture{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .sidebarList_fixture .typeThread_fixture [data-text-variant]{font-size:14px;line-height:20px}`;
  document.head.append(style);
}
