export const sampleImage = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="300" viewBox="0 0 720 300"><rect width="720" height="300" fill="#e9f1e9"/><path d="M0 240 190 65 350 230 500 105 720 300H0" fill="#97b99e"/><path d="m80 300 220-220 210 220" fill="#59886b"/><circle cx="590" cy="68" r="26" fill="#f9edc0"/><text x="28" y="42" font-family="sans-serif" font-size="14" fill="#355840">MONDAY / FIELD NOTES</text></svg>');
export const sampleEmoji = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="11" cy="11" r="10" fill="#86b48e"/><path d="m5 11 4 4 8-8" fill="none" stroke="white" stroke-width="2"/></svg>');

export function messageMarkup(id: number, author: string, text: string, options: { image?: boolean; spoiler?: boolean; continuation?: boolean; reaction?: boolean; reply?: boolean; customEmoji?: boolean } = {}) {
  const time = new Date(Date.UTC(2026, 8, 7, 0, 30 + id));
  return `<li id="chat-messages-1000-${id}" class="messageListItem_fixture">
    <div class="message_fixture">
      <div class="contents_fixture">
        ${!options.continuation ? `<span class="avatar_fixture">${author[0]}</span><h3 class="header_fixture"><span id="message-username-${id}" class="username_fixture">${author}</span><time datetime="${time.toISOString()}">${time.getUTCHours() + 9}:${String(time.getUTCMinutes()).padStart(2, '0')}</time></h3>` : `<time class="timestamp_fixture" datetime="${time.toISOString()}">09:35</time>`}
        ${options.reply ? '<div class="repliedMessage_fixture">↳ 지윤 · 지난번에 이야기한 시안 공유 부탁드려요.</div>' : ''}
        <div id="message-content-${id}" class="messageContent_fixture">${text}${options.customEmoji ? ` <img class="emoji" src="${sampleEmoji}" alt=":approved:" width="20" height="20">` : ''}</div>
      </div>
      <div class="accessories_fixture">
        ${options.image ? `<div class="imageWrapper_fixture"><div class="${options.spoiler ? 'spoilerContent_fixture' : 'imageContent_fixture'}"><a href="${sampleImage}" target="_blank" rel="noopener"><img src="${sampleImage}" alt="초록색 산 풍경 샘플" width="540" height="225"></a>${options.spoiler ? '<button class="spoilerCover_fixture" data-action="spoiler">스포일러 · 클릭하여 공개</button>' : ''}</div></div>` : ''}
        ${options.reaction ? '<div class="reactions_fixture"><button type="button" class="reaction_fixture" role="button" aria-pressed="false" data-action="reaction"><span>👍</span> <span class="reactionCount_fixture">3</span></button><button type="button" class="reaction_fixture" role="button" aria-pressed="false" data-action="reaction"><span>🔥</span> <span class="reactionCount_fixture">2</span></button></div>' : ''}
      </div>
      <button type="button" class="reply_fixture" data-action="reply" aria-label="${author}에게 답장">↩ 답장</button>
    </div>
  </li>`;
}

export function fixtureMarkup() {
  return `<div id="app-mount"><div class="native-layout">
    <nav class="guilds_fixture" aria-label="서버"><div data-list-id="guildsnav">
      <a data-list-item-id="guildsnav___home" aria-label="개인 메시지" href="/channels/@me">DM</a>
      <div class="listItem_fixture"><button data-list-item-id="guildsnav___100" aria-label="디자인 스튜디오">DS</button></div>
      <div class="listItem_fixture"><button data-list-item-id="guildsnav___200" aria-label="사이드 프로젝트">SP</button><span class="unread_fixture"></span></div>
      <div class="listItem_fixture"><button data-list-item-id="guildsnav___300" aria-label="퇴근 후 모임">AC</button></div>
      <div class="listItem_fixture"><button data-list-item-id="guildsnav___400" aria-label="개발 이야기">DEV</button></div>
      <div class="listItem_fixture"><button data-list-item-id="guildsnav___500" aria-label="읽고 쓰는 사람들">BK</button></div>
    </div></nav>
    <nav class="sidebarList_fixture" aria-label="채널">
      <div class="workspace-heading"><span class="workspace-icon">DS</span><div><strong>디자인 스튜디오</strong><small>함께 만드는 공간</small></div></div>
      <div class="channel-category">⌄ &nbsp; INFORMATION</div>
      <a class="channel-link" href="/channels/100/1001">⌑ <span>공지사항</span></a>
      <a class="channel-link" href="/channels/100/1002">⌑ <span>팀 가이드</span></a>
      <div class="channel-category">⌄ &nbsp; WORKSPACE</div>
      <a class="channel-link" href="/channels/100/1000" aria-current="page"># <span class="name_fixture">일반</span><span class="channel-count">4</span></a>
      <a class="channel-link" href="/channels/100/1003"># <span>디자인 공유</span></a>
      <a class="channel-link" href="/channels/100/1004"># <span>개발 논의</span></a>
      <a class="channel-link" href="/channels/100/1005"># <span>레퍼런스</span></a>
      <div class="channel-category">⌄ &nbsp; LOUNGE</div>
      <a class="channel-link" href="/channels/100/1006"># <span>잡담</span></a>
      <a class="channel-link" href="/channels/100/1007"># <span>오늘의 음악</span></a>
      <div class="sidebar-footnote"><span class="self-avatar">J</span><div><strong>나의 워크스페이스</strong><small>● 온라인</small></div><span>⚙</span></div>
    </nav>
    <div class="chat_fixture">
      <section class="title_fixture container_fixture" aria-label="채널 헤더"><h1># 일반</h1><div class="toolbar_fixture"><div class="search_fixture"><input role="searchbox" placeholder="검색" aria-label="대화 검색"></div></div></section>
      <main class="chatContent_fixture" role="main">
        <div class="messages-scroller"><ol data-list-id="chat-messages">
          <div class="divider_fixture"><span class="content_fixture">2026년 9월 7일 월요일</span></div>
          ${messageMarkup(1, '지윤', '좋은 아침이에요! 이번 주도 잘 부탁드립니다 ☀️')}
          ${messageMarkup(2, '민수', '좋은 아침입니다! 주말에 정리한 레퍼런스 먼저 공유할게요.', { image: true })}
          ${messageMarkup(3, '서연', '컬러 톤 너무 좋네요. 이번 랜딩에도 잘 어울릴 것 같아요.', { reaction: true })}
          ${messageMarkup(4, '도현', '오전 11시에 짧게 싱크 맞출까요? <span class="mention" role="button" tabindex="0">@지윤</span> <span class="mention" role="button" tabindex="0">@서연</span>')}
          ${messageMarkup(5, '지윤', '네, 좋아요! 그전에 시안 올려둘게요 👍', { customEmoji: true })}
          ${messageMarkup(6, '지윤', '그리고 오늘 논의할 내용 정리했습니다.<br>1. 첫 화면 헤드라인 &amp; 버튼 문구<br>2. 모바일에서 카드 간격<br>3. 다음 주 배포 일정', { continuation: true })}
          ${messageMarkup(7, '민수', '작업 노트는 <a href="https://example.com" target="_blank" rel="noopener">프로젝트 문서</a>에 업데이트해 뒀어요. 확인 부탁드려요.')}
          ${messageMarkup(8, '서연', '첫 번째 시안 공유합니다. 피드백 편하게 남겨주세요!', { image: true, reply: true, reaction: true })}
          ${messageMarkup(9, '도현', '컴포넌트 작업 완료했습니다. 오늘 오후부터 연결할 수 있어요 ✅', { customEmoji: true })}
          ${messageMarkup(10, '민수', '오 빠르다… 커피 한 잔 하고 바로 확인할게요 ☕')}
          ${messageMarkup(11, '지윤', '다들 감사합니다. 오늘도 차근차근 가봅시다 🌿', { reaction: true })}
          ${messageMarkup(12, '서연', '아직 공개 전인 두 번째 시안은 스포일러로 남겨둘게요.', { image: true, spoiler: true })}
        </ol></div>
        <form class="form_fixture"><div class="attachedBars_fixture" hidden></div><div class="channelTextArea_fixture"><div class="scrollableContainer_fixture"><div class="inner_fixture"><button type="button" class="attachButton_fixture" aria-label="파일 첨부">＋</button><input type="file" hidden><div class="textArea_fixture"><div role="textbox" aria-label="메시지 입력" contenteditable="true" data-slate-editor="true" data-placeholder="일반에 메시지 보내기" spellcheck="false"></div></div><div class="buttons_fixture"><button type="button" aria-label="이모지 선택" data-action="emoji-picker">☺</button></div></div></div></div></form>
      </main>
    </div>
  </div></div>`;
}
