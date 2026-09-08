import { messageMarkup, sampleAvatar, sampleEmoji } from './fixture';

/** Same content in sample and observed native wrapper shapes; no account data. */
export function addMessageParityFixture() {
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  const cases = [
    { name: 'emoji', text: `<span class="emojiContainer_parity"><img class="emoji jumboable" src="${sampleEmoji}" alt=":approved:" width="48" height="48"></span>` },
    { name: 'plain', text: '좋은 아침입니다. 이번 주도 잘 부탁드립니다.' },
    { name: 'multiline', text: '오늘 논의할 내용을 정리했습니다.<br>1. 첫 화면 제목<br>2. 모바일 카드 간격' },
    { name: 'reply', text: '첫 번째 시안 공유합니다.', reply: true },
    { name: 'reply-edited', text: '첫 번째 시안 공유합니다.', reply: true },
    { name: 'reaction', text: '컬러 톤 너무 좋네요.', reaction: true },
    { name: 'reaction-flat', text: '컬러 톤 너무 좋네요.', reaction: true },
    { name: 'embed', text: '' },
    { name: 'image', text: '첫 번째 시안입니다.', image: true },
    { name: 'code', text: '<pre><code>const value = "' + 'long-value-'.repeat(20) + '";</code></pre>' },
  ];
  list.innerHTML = cases.flatMap((item, index) => ['sample', 'native'].map((variant, offset) => {
    const id = 100 + index * 2 + offset;
    const holder = document.createElement('div');
    holder.innerHTML = messageMarkup(id, '지윤', item.text, item);
    const row = holder.firstElementChild as HTMLElement;
    row.dataset.parityCase = item.name;
    row.dataset.parityVariant = variant;
    row.querySelector('time')!.setAttribute('datetime', '2026-09-07T00:31:00Z');
    row.querySelector('.reply_fixture')?.remove();
    if (item.reply) {
      const reply = row.querySelector('.repliedMessage_fixture')!;
      reply.innerHTML = `<img class="replyAvatar_fixture" src="${sampleAvatar}"><span class="username_fixture">지윤 · </span><span class="repliedText_fixture">지난번에 이야기한 시안 공유 부탁드려요.</span>`;
      if (variant === 'native') {
        reply.className = 'repliedMessage_parity';
        reply.innerHTML = `<div class="repliedMessageClickableSpine_parity"></div><img class="replyAvatar_parity" src="${sampleAvatar}"><span class="username_parity">지윤 · </span><div class="repliedTextPreview_parity"><div class="repliedTextContent_parity messageContent_parity">지난번에 이야기한 시안 공유 부탁드려요.</div></div>`;
        row.querySelector('.message_fixture')!.prepend(reply);
        if (item.name === 'reply-edited') reply.querySelector('.repliedTextContent_parity')!.insertAdjacentHTML('beforeend', '<span class="timestamp_parity"><time><span class="edited_parity">(수정됨)</span></time></span>');
      }
    }
    if (item.name === 'embed') {
      const content = '<div class="embedAuthor_parity"><span class="embedAuthorName_parity">참고 자료</span></div><div class="embedDescription_parity">프로젝트 진행 상황을 확인해 주세요.</div>';
      row.querySelector('.accessories_fixture')!.innerHTML = variant === 'sample'
        ? `<div class="embed_fixture">${content}</div>`
        : `<article class="embed_parity embedFull_parity"><div class="gridContainer_parity"><div class="grid_parity">${content}</div></div></article>`;
    }
    if (variant === 'native') {
      if (item.image) {
        row.querySelector('[id^="message-username-"]')!.innerHTML = '<span class="username_parity">지윤</span><span>작성자</span><span class="hiddenVisually_parity">게시글 작성자</span>';
        const media = row.querySelector('.imageWrapper_fixture')!;
        const mosaic = document.createElement('div');
        mosaic.className = 'mosaicItem_parity';
        mosaic.style.display = 'flex';
        media.before(mosaic); mosaic.append(media);
        const image = row.querySelector('.imageContent_fixture')!;
        image.className = 'clickableWrapper_parity';
        image.setAttribute('role', 'button');
        image.setAttribute('aria-label', '이미지');
      }
      row.classList.add('native-parity');
      row.querySelector('.accessories_fixture')!.className = 'container_parity';
      for (const reaction of row.querySelectorAll('.reaction_fixture')) {
        reaction.className = 'reaction_parity';
        if (item.name === 'reaction-flat') { reaction.classList.add('reactionInner_parity'); continue; }
        reaction.innerHTML = `<div class="reactionInner_parity">${reaction.innerHTML}</div>`;
        const wrapper = document.createElement('div');
        reaction.before(wrapper); wrapper.append(reaction);
      }
    }
    return row.outerHTML;
  })).join('');
  list.insertAdjacentHTML('afterbegin', '<div id="chat-messages-post-heading"><div class="iconWrapper_parity">포스트</div><h3>포스트 본문·첨부 파일 비교</h3></div>');
  const style = document.createElement('style');
  style.textContent = `
    .native-parity .jumboable{min-height:48px;min-width:48px}
    .native-parity{line-height:13px}.native-parity .container_parity{display:grid;padding:2px 0;gap:4px}
    .native-parity .embed_parity{display:grid;font:16px/22px sans-serif}
    .native-parity .grid_parity{display:grid;padding:2px 16px 16px 12px}
    .native-parity .embedAuthor_parity{display:flex;margin-top:8px}
    .native-parity .embedAuthorName_parity{font:600 14px/22px sans-serif}
    .native-parity .embedDescription_parity{font:14px/18px sans-serif;margin-top:8px}
    .repliedMessage_parity{display:flex;line-height:18px}.replyAvatar_parity{width:16px;height:16px;margin-right:4px}
    .repliedTextPreview_parity{display:flex;height:15px;max-height:13.75px}.repliedTextContent_parity{display:flow-root;height:15px}
    .timestamp_parity{display:inline-block;font:500 12px/22px sans-serif;height:20px}.edited_parity{font:10px/10px sans-serif}
    .repliedMessageClickableSpine_parity{position:absolute;left:-33px;width:33px;height:16px;border-top:1px solid}
    .native-parity .reactions_fixture{display:flex;margin-bottom:-8px;padding:2px 0 6px}
    .reaction_parity{display:block;margin:0 4px 4px 0;padding:0}
    .reactionInner_parity{display:flex;padding:2px 6px;height:24px}
  `;
  document.head.append(style);
}
