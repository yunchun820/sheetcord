import { sampleEmoji } from './fixture';

export function addPickerFixture() {
  const panel = document.createElement('section');
  panel.className = 'positionContainer_picker';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '표현 선택기');
  panel.innerHTML = `<div class="drawerSizingWrapper_picker" style="position:absolute;right:24px;width:498px"><div class="contentWrapper_picker"><nav aria-label="표현 선택기 카테고리">GIF · 스티커 · 이모지</nav><input aria-label="검색하기" placeholder="검색"><div class="emojiSpriteImage_picker" style="background-image:url('${sampleEmoji}');width:40px;height:40px"><span class="hiddenVisually_picker">:approved:</span></div></div></div>`;
  document.querySelector('#app-mount')!.append(panel);
  panel.querySelector('.contentWrapper_picker')!.insertAdjacentHTML('beforeend', '<div id="gif-picker-tab-panel" style="position:relative;height:120px"><div class="result_fixture" role="button" tabindex="0" aria-label="즐겨찾기" style="position:absolute;left:12px;top:0;width:200px;height:110px;background:#5865f2"><div class="categoryFadeBlurple_fixture"></div><div class="categoryText_fixture"><span class="categoryName_fixture">즐겨찾기</span></div></div><div class="result_fixture" role="button" tabindex="0" aria-label="긴 카테고리" style="position:absolute;left:224px;top:0;width:200px;height:110px;background:#202020"><div class="categoryFade_fixture"></div><div class="categoryText_fixture"><span class="categoryName_fixture">길이가 긴 카테고리 이름도 제목 셀에 표시</span></div></div></div>');
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') panel.remove(); });
}

export function addReactionPickerFixture() {
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '반응 선택기');
  panel.innerHTML = `<div class="header_reaction"><div style="width:197px"><input role="combobox" aria-label="반응 검색" placeholder="딱 맞는 반응 찾기"></div><button>슈퍼 반응 활성화</button><button>이모지 추가</button></div><div class="emojiPicker_reaction" style="width:498px;height:440px"><div class="bodyWrapper_reaction" style="width:450px"><div role="grid"><span class="emojiSpriteImage_reaction" style="display:block;background-image:url('${sampleEmoji}');width:40px;height:40px"></span></div></div></div><div class="categoryList_reaction" style="position:absolute;top:80px">최근</div>`;
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') panel.remove(); });
  const picker = panel.querySelector<HTMLElement>('.emojiPicker_reaction')!;
  picker.style.display = 'grid';
  picker.style.gridTemplateColumns = '48px 1fr';
  picker.firstElementChild!.setAttribute('style', 'grid-column:2;width:450px');
  document.querySelector('#app-mount')!.append(panel);
}

export function addHeaderPanelFixture() {
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '스레드 샘플');
  panel.innerHTML = '<div class="browser_panel" style="width:600px;height:400px"><div class="header_panel" style="display:flex"><h1>스레드</h1><div><input aria-label="스레드 이름 검색하기"></div><button class="primary_panel">스레드 만들기</button></div><p>아직 스레드가 없습니다.</p></div>';
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') panel.remove(); });
  document.querySelector('#app-mount')!.append(panel);
}

export function addSearchFilterFixture() {
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '필터');
  panel.style.cssText = 'position:fixed;top:230px;left:50%;transform:translateX(-50%);z-index:400';
  panel.innerHTML = '<div class="outerContainer_filter fullScreenOnMobile_filter" style="width:100vw;padding:24px;display:flex;justify-content:center"><div style="width:480px"><header>필터 <button aria-label="필터 닫기">닫기</button></header><label><div class="switchIndicator_filter" data-mana-component="switch" style="background:#5865f2"><svg></svg></div><span class="hiddenVisually_filter" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"><input role="switch" type="checkbox" aria-label="샘플 알림" checked></span></label><p>보낸 이</p><input aria-label="보낸 이"><p>위치</p><input aria-label="위치"><footer><button>취소</button><button class="primary_filter" disabled style="background:#5865f2">필터 적용</button></footer></div></div>';
  panel.querySelector('[aria-label="필터 닫기"]')!.addEventListener('click', () => panel.remove());
  document.querySelector('#app-mount')!.append(panel);
}
export function addContextMenuFixture() {
  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', '샘플 채널 메뉴');
  menu.style.cssText = 'position:fixed;left:24px;top:230px;width:230px;z-index:400;background:white';
  menu.innerHTML = '<div role="menuitem" tabindex="0" aria-haspopup="true" aria-expanded="false">알림 설정</div><div role="menuitemradio" tabindex="0" aria-checked="true">카테고리 기본값 사용</div><div role="menuitemradio" tabindex="0" aria-checked="false">모든 메시지</div><div role="menuitemcheckbox" tabindex="0" aria-checked="true">선택된 항목</div><div role="menuitem" tabindex="0">일반 항목</div>';
  menu.addEventListener('keydown', event => { if (event.key === 'Escape') menu.remove(); });
  document.querySelector('#app-mount')!.append(menu);
}

export function addMessageSubmenuFixture() {
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;left:0;top:0;transform:translate(4px,326px);z-index:400';
  layer.innerHTML = '<div id="message" role="menu" style="width:381px;height:466px;background:white"><div style="position:relative;height:450px"><div role="menuitem" tabindex="0">앱</div><div role="group"><div data-popover-layer style="position:fixed;left:0;top:0;transform:translate(369px,240px)"><div class="submenuPaddingContainer_fixture" style="padding:0 12px"><div class="submenu_fixture" role="menu" style="width:188px;background:white"><div role="menuitem" aria-disabled="true" tabindex="-1">사용 가능한 명령어 없음</div></div></div></div></div></div></div>';
  layer.addEventListener('keydown', event => { if (event.key === 'Escape') layer.remove(); });
  document.querySelector('#app-mount')!.append(layer);
}

export function addPostUploadFixture() {
  const panel = document.createElement('section');
  panel.setAttribute('data-sc-form', '');
  panel.style.cssText = 'position:fixed;left:82px;right:4px;top:230px;z-index:400;background:white';
  panel.innerHTML = '<div class="formContainer_fixture" style="display:flex;padding:0 8px 0 12px"><div style="flex:1;min-width:0">제목<br>내용 입력 셀</div><div class="container_upload" style="width:78px;height:78px;flex-shrink:0"><div class="uploadInput_fixture" data-sc-text-control="" role="button" aria-label="미디어 추가하기" tabindex="0" style="width:max-content">미디어 추가하기</div></div></div>';
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') panel.remove(); });
  document.querySelector('#app-mount')!.append(panel);
}

export function addStickerRailFixture() {
  const panel = document.createElement('section');
  panel.id = 'sticker-picker-tab-panel';
  panel.style.cssText = 'position:fixed;right:12px;top:200px;width:min(494px,calc(100vw - 24px));height:350px;display:grid;grid-template-columns:48px 1fr;grid-template-rows:50px 1fr;z-index:400;background:white';
  panel.innerHTML = '<header style="grid-column:1/3">스티커 검색</header><div class="listWrapper_fixture" style="grid-column:2;position:relative;background:#fff;border:1px solid #c8d0ca">스티커 격자 영역</div><div class="categoryList_fixture" style="position:absolute;top:50px;left:0;width:48px;display:grid;grid-template-columns:48px"><div role="list"><div role="listitem" style="height:44px"><div class="stickerCategory_fixture" role="button" tabindex="0" aria-label="TTeokborobo Dev."><span>아이콘</span></div></div><div role="listitem" style="height:44px"><div class="stickerCategory_fixture" role="button" tabindex="0" aria-label="test"><span>t</span></div></div></div></div>';
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') panel.remove(); });
  document.querySelector('#app-mount')!.append(panel);
}
