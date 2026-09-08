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
