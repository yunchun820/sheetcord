import { messageMarkup, sampleImage } from './fixture';

/** Synthetic content in observed Discord wrappers; contains no account data. */
export function addSystemEmbedFixture() {
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  const notice = (id: number, text: string, welcome = false) => `
    <li id="chat-messages-1000-${id}" class="messageListItem_fixture">
      <div class="message_fixture systemMessage_fixture isSystemMessage_fixture">
        <div class="contents_fixture"><div id="message-content-${id}" class="messageContent_fixture">
          <div class="container_notice"><div class="iconContainer_notice">◆</div><div class="content_notice"><div>
            <a role="link" tabindex="0"><span class="username_fixture">새 동료</span></a> ${text}
            <span class="timestampInline_fixture"><time datetime="2026-09-10T01:02:00Z">오전 10:02</time></span>
          </div></div></div>
          ${welcome ? '<div class="welcomeCTA_fixture"><button type="button"><span role="img" aria-label="Wave 스티커"><canvas class="stickerAsset_fixture" data-type="sticker" data-name="Wave" width="24" height="24"></canvas></span>손을 흔들어 인사해보세요!</button></div>' : ''}
        </div></div>
      </div>
    </li>`;
  list.innerHTML = messageMarkup(801, '담당자', '오늘의 작업 기록입니다.')
    + notice(802, '님이 서버에 들어오셨어요.', true)
    + notice(803, '님이 서버를 부스트했어요!')
    + messageMarkup(804, '담당자', '자료를 공유합니다.')
    + messageMarkup(805, '담당자', '첫 번째 줄입니다.<br>두 번째 줄도 한 칸에 갇히지 않습니다.');
  const richRow = document.getElementById('chat-messages-1000-804')!;
  richRow.querySelector('.accessories_fixture')!.innerHTML = `
    <article class="embed_fixture embedFull_fixture" style="max-width:432px;border-left:4px solid purple">
      <div class="gridContainer_embed"><div class="grid_embed">
        <div class="embedProvider_fixture"><a href="https://example.com">자료실</a></div>
        <div class="embedAuthor_fixture"><span class="embedAuthorName_fixture username_embed">문서 작성자</span></div>
        <div class="embedTitle_fixture"><a href="https://example.com/report">주간 진행 현황</a></div>
        <div class="embedDescription_fixture">제목, 설명, 항목을 별도 행으로 배치합니다.<br>관련 링크와 원본 열기는 그대로 사용할 수 있습니다.</div>
        <div class="embedFields_fixture">
          <div class="embedField_fixture" style="grid-column:1/5"><div class="embedFieldName_fixture">진행 상태</div><div class="embedFieldValue_fixture">검토 중</div></div>
          <div class="embedField_fixture" style="grid-column:5/9"><div class="embedFieldName_fixture">참고 주소</div><div class="embedFieldValue_fixture"><a href="https://example.com">https://example.com/${'long-path-'.repeat(20)}</a></div></div>
          <div class="embedField_fixture"><div class="embedFieldName_fixture">할 일</div><div class="embedFieldValue_fixture">서식 확인<br>내용 검토<br>공유 준비</div></div>
        </div>
        <div class="embedImage_fixture"><div class="imageWrapper_fixture" style="width:320px;height:180px"><img src="${sampleImage}" alt="샘플 도표" width="320" height="180"></div></div>
        <div class="embedFooter_fixture">문서 기록 · <time datetime="2025-01-01T00:00:00Z">2025. 1. 1.</time></div>
        <button class="embedSuppressButton_fixture" type="button">임베드 제거</button>
      </div></div>
    </article>`;
  const style = document.createElement('style');
  style.textContent = `.container_notice{display:flex;margin-left:40px;min-height:48px}.iconContainer_notice{width:40px;color:purple}.content_notice{font:16px/24px sans-serif}.welcomeCTA_fixture{margin-top:16px}
    .grid_embed{display:grid;grid-template-columns:1fr 80px;padding:16px}.embedFields_fixture{display:grid;grid-template-columns:repeat(12,1fr);gap:8px}.embedField_fixture{grid-column:1/-1}.embedSuppressButton_fixture{position:absolute;right:0;top:0}.embedTitle_fixture,.embedDescription_fixture{grid-column:1}.embedImage_fixture{grid-column:2}`;
  document.head.append(style);
}
