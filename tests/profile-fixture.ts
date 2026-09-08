import { sampleAvatar } from './fixture';

export function addFullProfileFixture() {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', '전체 프로필 샘플');
  dialog.style.cssText = 'position:fixed;left:12px;top:200px;width:1202px;height:518px;overflow:auto;z-index:400;background:white';
  dialog.innerHTML = `<div class="root_full" style="width:1202px;height:759px"><div class="layoutContainer_full" style="display:flex;width:1202px;height:759px;position:relative">
    <div><div class="modalHeaderButtons_full" style="position:absolute;right:8px;top:8px"><button aria-label="샘플 프로필 닫기">닫기</button></div></div>
    <aside class="editingPanel_full" style="width:240px;flex-shrink:0;height:759px"><h2>프로필 스타일</h2><p>스타일 패널 샘플</p><button>스타일 숨기기</button></aside>
    <div class="user-profile-modal-v2" style="width:960px;height:759px"><div class="profileContentInner_full" style="height:757px">
    <div class="profileContentColumns_full" style="display:flex;width:878px;height:709px;padding:48px">
      <main class="profile_full" style="width:400px;height:709px;flex-shrink:0"><div class="profileHeader_full" style="height:220px"><div class="avatar_full" data-sc-avatar="" style="position:absolute;width:120px;height:120px"><div class="wrapper_full"><svg viewBox="0 0 120 120" width="120" height="120"><defs><mask id="fixture-avatar-mask"><circle cx="60" cy="60" r="60" fill="white"/></mask></defs><foreignObject width="120" height="120" mask="url(#fixture-avatar-mask)"><img src="${sampleAvatar}" width="120" height="120" style="border-radius:50%"></foreignObject></svg></div></div><div class="container_status"><button>아주 긴 상태 문구도 옆 셀을 침범하지 않도록 표시합니다</button></div></div><h2>샘플 사용자</h2><div class="profileBody_full" style="height:493px;overflow:auto"><section><h3>소개글</h3><p>${'긴 소개가 셀 안에서 줄바꿈되는지 확인합니다. '.repeat(15)}</p></section><div class="editable_full"><div>클릭하여 메모 추가하기</div><div role="button" aria-label="메모" tabindex="0"></div></div><p role="status">메모 대기</p><textarea aria-label="샘플 메모 입력" style="height:73px;width:100%;box-sizing:border-box"></textarea></div></main>
      <div style="width:446px"><div role="tablist"><button role="tab" aria-selected="true">보드</button><button role="tab" aria-selected="false">활동</button></div><div class="tabPanelScroller_full" style="height:659px;overflow:auto"><p>샘플 보드</p></div></div>
    </div></div></div></div></div>`;
  dialog.querySelector('[aria-label="샘플 프로필 닫기"]')!.addEventListener('click', () => dialog.remove());
  dialog.querySelector('.profileBody_full')!.insertAdjacentHTML('afterbegin', `
    <section class="section_full"><div class="headings_full"><div class="header_full"><h2>소개글</h2></div></div><div>${'아주 긴 소개와 공백없는이름이셀밖으로나가지않아야합니다'.repeat(4)}</div></section>
    <section class="section_full"><div class="headings_full"><div class="header_full"><h2>역할</h2></div></div><div><button>긴 역할 이름 · 프로젝트 관리자</button></div></section>`);
  const note = dialog.querySelector<HTMLElement>('[aria-label="메모"]')!;
  note.addEventListener('click', () => { dialog.querySelector('[role="status"]')!.textContent = '메모 클릭 확인'; });
  note.addEventListener('keydown', event => { if (event.key === 'Enter') note.click(); });
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape') dialog.remove(); });
  document.querySelector('#app-mount')!.append(dialog);
}

export function addProfileFixture() {
  const header = document.querySelector('[aria-label="채널 헤더"]')!;
  const toolbar = header.querySelector('[class*="toolbar_"]')!;
  const wrapper = document.createElement('div');
  toolbar.before(wrapper); wrapper.append(toolbar);
  for (const label of ['스레드', '알림 설정', '고정된 메시지', '멤버 목록 표시하기']) {
    const control = document.createElement('div');
    control.setAttribute('role', 'button');
    control.setAttribute('tabindex', '0');
    control.setAttribute('aria-label', label);
    control.innerHTML = '<svg aria-hidden="true" width="20" height="20"></svg>';
    toolbar.prepend(control);
    control.addEventListener('click', () => { profile.querySelector('[role="status"]')!.textContent = `${label} 열기 확인`; });
  }
  const profile = document.createElement('section');
  profile.className = 'user-profile-popout';
  profile.style.cssText = 'position:fixed;left:12px;top:230px;width:300px;z-index:300;padding:12px';
  profile.innerHTML = `<div class="inner_profile"><div class="header_profile"><div class="banner_profile" style="height:105px"></div><div class="avatar_profile" style="width:80px;height:80px"><div class="focusTarget_profile" role="button" tabindex="0" aria-label="전체 프로필 보기"></div><img class="avatar_profileImage" src="${sampleAvatar}" width="80" height="80"></div><div class="referenceContainer_profile">상태 복제</div><div class="container_profileStatus"><div class="outer_profileStatus" role="button" tabindex="0" aria-label="사용자 지정 상태 추가하기"><span class="inner_profileStatus"><span class="addStatusPrompt_profile">아주 긴 상태 문구도 옆 셀을 침범하지 않고 여러 줄에 걸쳐 표시됩니다.</span></span></div></div></div><h2>샘플 사용자</h2><p>긴 소개도 줄바꿈되어 셀 안에 표시되어야 합니다. 🌿</p><div class="overlay_fixture menuOverlay_fixture" style="background:#2b2d31"><div class="menuItem_fixture"><button>프로필 편집</button></div><div class="menuItem_fixture"><button>내 상태: 온라인</button></div></div><p role="status">프로필 대기</p></div>`;
  const target = profile.querySelector<HTMLElement>('[role="button"]')!;
  target.addEventListener('click', () => { profile.querySelector('[role="status"]')!.textContent = '프로필 열기 확인'; });
  target.addEventListener('keydown', event => { if (event.key === 'Enter') target.click(); });
    const members = document.createElement('aside');
  members.className = 'membersWrap_profile';
  members.style.cssText = 'position:fixed;right:12px;top:230px;width:240px;z-index:200';
  members.innerHTML = `<div class="members_profile" role="list" aria-label="샘플 멤버"><h3 class="membersGroup_profile">온라인 — 1</h3><div class="member_profile" role="listitem" tabindex="0"><div class="name_profile">샘플 사용자</div><div class="subText_profile">온라인</div></div></div>`;
  const command = document.createElement('div');
  command.className = 'autocomplete_profile';
  command.style.cssText = 'position:fixed;right:12px;top:400px;width:240px;z-index:200';
  command.innerHTML = '<div class="usageWrapper_profile" style="display:flex"><span>/랜덤</span><span class="option_profile" style="background:#121214;color:#243329">모드</span><span class="option_profile" style="background:#121214;color:#243329">레벨</span></div>';
  document.querySelector('#app-mount')!.append(profile, members, command);
}

export function addAccountProfileFixture() {
  const wrap = document.createElement('div');
  wrap.className = 'accountPopout_fixture';
  wrap.style.cssText = 'position:fixed;top:0;left:4px;display:flex;align-items:flex-end;width:304px;height:561px;overflow:auto';
  wrap.innerHTML = '<div class="user-profile-popout" style="height:672px;min-height:672px;flex-shrink:0"><button>전체 프로필 보기</button><h2>계정 샘플</h2><button>사용자 지정 상태 추가하기</button><div style="height:470px">긴 활동 카드 샘플</div><button>내 상태: 온라인</button><button>샘플 계정 닫기</button></div>';
  wrap.querySelector('button:last-child')!.addEventListener('click', () => wrap.remove());
  wrap.addEventListener('keydown', event => { if (event.key === 'Escape') wrap.remove(); });
  document.querySelector('#app-mount')!.append(wrap);
}
