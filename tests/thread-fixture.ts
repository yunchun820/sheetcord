import { messageMarkup, sampleAvatar } from './fixture';

/** Thread accessory plus a screen-reader transcript; synthetic content only. */
export function addThreadFixture() {
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  list.innerHTML = messageMarkup(201, '지윤', '이 내용은 스레드에서 이어서 이야기해요.', { customEmoji: true })
    + messageMarkup(202, '민수', '다음 메시지는 정상 위치에 표시됩니다.');
  const row = list.firstElementChild!;
  row.querySelector('.message_fixture')!.insertAdjacentHTML('afterbegin', `<div class="hiddenVisually_thread" id="thread-transcript">
    [13:11] 인용된 대화의 시간과 전체 설명입니다. 😀
    <span class="username_thread">설명 속 작성자</span><time datetime="2026-09-08T04:11:00Z">13:11</time>
    <div>작성자</div><div>화면에 중복 표시하면 안 되는 접근성 설명입니다.</div>
    <img src="${sampleAvatar}" alt="설명 안 이미지">
  </div>`);
  row.querySelector('.accessories_fixture')!.innerHTML = `<div class="container_thread threadMessageAccessory_thread" role="button" tabindex="0" aria-labelledby="thread-title">
    <div class="spine_thread"></div>
    <div class="topLine_thread"><span class="threadName_thread" id="thread-title">긴 제목의 스레드에서 이야기해요 — 다음 작업 범위와 일정 정리 😀</span><span class="cta_thread">메시지 12개 ›</span></div>
    <div class="bottomLine_thread"><img class="avatar_thread" src="${sampleAvatar}" alt="서연 프로필 사진"><span class="username_thread">서연</span><div class="threadMessagePreview_thread">확인했어요. 이어지는 내용도 함께 정리해 둘게요 👍</div></div>
  </div>`;
  const card = row.querySelector<HTMLElement>('.threadMessageAccessory_thread')!;
  card.addEventListener('click', () => { card.dataset.opened = 'true'; });
  const style = document.createElement('style');
  style.textContent = `
    .container_thread{width:480px;min-width:420px;margin-left:32px;background:#313338;padding:16px;position:relative}
    .topLine_thread,.bottomLine_thread{display:flex;white-space:nowrap;gap:8px}
    .threadName_thread{max-width:380px;overflow:hidden;text-overflow:ellipsis}
    .spine_thread{position:absolute;left:-25px;top:-16px;width:25px;height:65px;border-left:2px solid gray;border-bottom:2px solid gray}
    .hiddenVisually_thread{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
    .avatar_thread{width:24px;height:24px}
  `;
  document.head.append(style);
}

/** Structural shape verified on Chrome; all text and assets remain synthetic. */
export function addNativeThreadFixture() {
  addThreadFixture();
  for (const row of document.querySelectorAll('li[id^="chat-messages-"]')) {
    row.querySelector('.message_fixture')!.setAttribute('data-list-item-id', `chat-messages___${row.id}`);
  }
  const card = document.querySelector<HTMLElement>('.threadMessageAccessory_thread')!;
  card.closest('.message_fixture')!.classList.add('hasThread_native');
  const connector = document.createElement('style');
  connector.textContent = '.hasThread_native::after{content:"";position:absolute;left:32px;bottom:30px;width:32px;height:85px;border-left:2px solid gray;border-bottom:2px solid gray;z-index:4}';
  document.head.append(connector);
  card.classList.remove('threadMessageAccessory_thread');
  card.setAttribute('aria-roledescription', '스레드 열기 버튼');
  card.querySelector('.threadName_thread')!.className = 'name__native';
  card.before(card.querySelector('.spine_thread')!);
  const bottom = card.querySelector('.bottomLine_thread')!;
  const accessory = document.createElement('div'); accessory.className = 'threadMessageAccessory_native';
  accessory.append(...bottom.childNodes); bottom.append(accessory);
  accessory.querySelector('.threadMessagePreview_thread')!.className = 'threadMessageAccessoryPreview_native';
  accessory.querySelector('.username_thread')!.insertAdjacentHTML('afterend', `<span><span class="copyOnlyText_native">[TEAM]</span><span class="clanTagChiplet_native"><img class="badge_native" src="${sampleAvatar}" alt="서버 태그"></span></span>`);
  const content = document.getElementById('message-content-201')!;
  content.textContent = Array.from({length:12},(_,i)=>`[13:${String(i).padStart(2,'0')}] 작성자: 인용된 실제 본문은 그대로 유지합니다.`).join('\n');
}

/** Native bot attachment preview, with synthetic author and artwork only. */
export function addBotThreadFixture() {
  addNativeThreadFixture();
  const accessory = document.querySelector('.threadMessageAccessory_native')!;
  accessory.querySelector('.username_thread')!.insertAdjacentHTML('beforebegin', '<span role="img" aria-label="앱" class="botTagCompact_native botTag_native botTagRegular_native"><span class="botText_native">앱</span></span>');
  accessory.querySelector('.threadMessageAccessoryPreview_native')!.innerHTML = '<span class="threadMessageAccessoryPlaceholder_native">첨부 파일을 보려면 클릭하세요</span><svg class="threadMessageAccessoryContentTrailingIcon_native" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v18H3z"/></svg>';
  const style = document.createElement('style');
  style.textContent = '.botTag_native{display:flex;align-items:center;background:#5865f2;color:white;border-radius:3px;height:15px;padding:0 4px;position:relative;top:1px}.botText_native{font-size:10px}.threadMessageAccessoryPreview_native{display:flex;align-items:center}.threadMessageAccessoryPlaceholder_native{font-style:italic}';
  document.head.append(style);
}
