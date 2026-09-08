import { messageMarkup, sampleImage, sampleEmoji } from './fixture';

export function addMediaDisplayFixture() {
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  list.innerHTML = messageMarkup(81, '이미지', '') + messageMarkup(82, '스티커', '')
    + messageMarkup(83, '이모지', `<img class="emoji jumboable_fixture" alt=":approved:" src="${sampleEmoji}">`)
    + messageMarkup(84, '텍스트', '한 줄 메시지');
  list.querySelector('#chat-messages-1000-81 .accessories_fixture')!.innerHTML = `<div class="mosaicContainer_fixture" style="height:280px;min-height:280px;display:grid;grid-template-rows:280px"><div class="mosaicItem_fixture" style="height:280px;aspect-ratio:1"><div class="imageWrapper_fixture"><img alt="산 풍경" src="${sampleImage}" width="240" height="240"></div></div></div>`;
  list.querySelector('#chat-messages-1000-82 .accessories_fixture')!.innerHTML = '<div class="stickerContainer_fixture" style="height:160px;min-height:160px;width:160px"><div class="stickerAsset_fixture" aria-label="인사하는 고양이" style="width:160px;height:160px"><canvas width="160" height="160"></canvas></div></div>';
  list.querySelector<HTMLElement>('#message-content-83')!.style.cssText = 'min-height:64px;height:64px;font-size:48px;line-height:64px';
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '이름 표시 샘플');
  panel.style.cssText = 'position:fixed;right:16px;bottom:70px;width:310px;padding:12px;background:white;border:1px solid #888;z-index:300';
  panel.innerHTML = `<p>보내기 목록 이름 표시 샘플</p>
    <div id="sticker-picker-tab-panel" style="display:flex;gap:4px"><button class="sticker_fixture" aria-label="인사하는 고양이" style="width:130px;height:80px"><canvas width="120" height="70"></canvas></button><button class="sticker_fixture" disabled style="width:130px;height:80px"><img alt="졸린 토끼" src="${sampleImage}"></button></div>
    <div id="gif-picker-tab-panel" style="display:flex"><div class="result_fixture" role="button" tabindex="0" aria-label="박수치는 고양이 GIF" style="width:130px;height:80px;background-image:url('${sampleImage}')"><video aria-label="박수치는 고양이 GIF"></video></div></div>
    <div id="emoji-picker-tab-panel" style="display:flex"><button class="emojiItem_fixture" data-name="approved" aria-label="승인" style="width:80px;height:40px"><img class="emoji" alt=":approved:" src="${sampleEmoji}"></button></div><p role="status">선택 없음</p>`;
  panel.addEventListener('click', event => {
    const choice = (event.target as Element).closest<HTMLElement>('button, [role="button"]');
    if (choice) panel.querySelector('[role="status"]')!.textContent = `선택: ${choice.getAttribute('data-sc-picker-label') || choice.getAttribute('aria-label')}`;
  });
  document.querySelector('#app-mount')!.append(panel);
}

export function addChromePolishFixture() {
  addMediaDisplayFixture();
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  list.insertAdjacentHTML('beforeend', messageMarkup(85, '일반 요소 스티커', ''));
  list.querySelector('#chat-messages-1000-85 .accessories_fixture')!.innerHTML = '<div class="mediaContainer_fixture" style="height:160px"><div class="imageWrapper_fixture"><img src="/stickers/123456789.png" alt="춤추는 고양이, 스티커" width="160" height="160"></div></div>';
  const panel = document.querySelector('[aria-label="이름 표시 샘플"]')!;
  panel.insertAdjacentHTML('afterbegin', '<button aria-label="고정된 메시지" style="background:#5865f2;color:#5865f2;border:1px solid #5865f2"><span style="color:#5865f2;background:#5865f2">고정된 메시지</span></button>');
}

export function addConcealRegressionFixture() {
  addMediaDisplayFixture();
  const host = document.querySelector<HTMLElement>('.stickerContainer_fixture')!;
  host.className = 'assetShell_fixture';
  host.innerHTML = '<div class="layer_fixture" style="position:absolute;height:160px;min-height:160px;padding-bottom:30px"><div class="stickerAsset_fixture" aria-label="쓰담냥이" style="height:160px"><canvas width="160" height="160"></canvas></div></div>';
  host.closest<HTMLElement>('li')!.style.height = '180px';
  const sidebar = document.querySelector<HTMLElement>('[aria-label="채널"]')!;
  const links = [...sidebar.querySelectorAll('a')].map(link => ({ link, parent: link.parentNode!, next: link.nextSibling }));
  const observer = new ResizeObserver(() => {
    const measurable = sidebar.clientWidth > 0 && sidebar.clientHeight > 0;
    for (const { link, parent, next } of links) {
      if (!measurable) link.remove();
      else if (!link.isConnected) parent.insertBefore(link, next?.parentNode === parent ? next : null);
    }
  });
  observer.observe(sidebar);
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
