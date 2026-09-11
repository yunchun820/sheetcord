import { sampleImage, sampleEmoji } from './fixture';

// Synthetic native list topology. No account content or identifiers.
export function forumCardMarkup(id: number, count = 0, loading = false) {
  return `<li class="card_fixture" data-item-role="item"><div class="container_forum mainCard_fixture" data-item-id="${id}">
    <div class="focusTarget_fixture" role="button" tabindex="0" data-list-item-id="forum-channel-list-1000___${id}" aria-label="포스트 작업 노트 ${id}, 메시지 2개"></div>
    <div class="left_fixture"><div class="body_fixture"><div class="header_forum"><h3 class="postTitleText_fixture">작업 노트 ${id}</h3></div>
      <div class="message_forum"><span class="author_fixture">샘플 작성자: </span><div id="message-content-${id}" class="messageContent_fixture">이번 주 진행한 내용을 정리했습니다.</div></div></div>
      <div data-focus-blocked><div class="footer_fixture"><div><div class="reaction_fixture"><div class="reactionInner_fixture" role="button" tabindex="0" aria-pressed="false" aria-label="skull반응, ${count}개, 눌러서 반응하기"><div></div><div><img class="emoji" src="${sampleEmoji}" alt="💀" data-type="emoji"></div>${count ? `<div class="reactionCount_fixture">${count}</div>` : ''}</div></div></div>
        <div class="messageCountBox_fixture">메시지 2개</div><span>·</span><span>13분 전</span></div></div>
    </div><div data-focus-blocked><div class="bodyMedia_fixture"><div class="imageContent_fixture"><div class="imageContainer_fixture"><div class="imageWrapper_fixture" style="width:400px;height:225px"><a href="${sampleImage}" target="_blank" rel="noopener" aria-label="원본 보기"><div class="loadingOverlay_fixture" style="aspect-ratio:16/9">${loading ? '' : `<img src="${sampleImage}" width="400" height="167" alt="샘플 풍경">`}</div></a></div></div></div></div></div>
  </div></li>`;
}

export function addForumFixture() {
  const nativeStyle = document.createElement('style');
  nativeStyle.textContent = '.container_forum { overflow:hidden } .container_forum > .focusTarget_fixture { width:0;height:0 } .container_forum .message_forum { display:flex;gap:4px } .container_forum .bodyMedia_fixture { width:72px;height:84px;overflow:hidden;position:relative } .container_forum .imageContent_fixture { display:flex;align-items:center;flex-direction:column } .container_forum .imageContainer_fixture { display:flex } .container_forum .loadingOverlay_fixture img { max-height:72px }';
  document.head.append(nativeStyle);
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  list.innerHTML = forumCardMarkup(2100) + forumCardMarkup(2101, 2) + forumCardMarkup(2102, 0, true);
  list.insertAdjacentHTML('afterbegin', '<div class="headerRow_fixture"><div class="mainCard_fixture header_fixture"><div class="collapsed_fixture" aria-label="포스트 만들기"></div></div></div>');
  list.querySelector('.collapsed_fixture')!.append(document.querySelector('form')!);
  document.querySelector('.toolbar_fixture')!.insertAdjacentHTML('afterbegin', '<div role="button" tabindex="0" aria-label="알림 설정">알림</div><div role="button" tabindex="0" aria-label="멤버 목록 표시하기">멤버</div>');
}
