import { messageMarkup, sampleImage } from './fixture';

/** Sample-only frame audit; no real messages, media URLs, or network timing involved. */
export function addMediaLoadingFixture() {
  const panel = document.createElement('section');
  panel.style.cssText = 'position:fixed;right:16px;top:240px;background:white;border:1px solid #aaa;padding:8px;z-index:20000';
  panel.innerHTML = '<button type="button">로딩 단계 점검</button><output id="loading-audit-result">준비</output>';
  document.querySelector('#app-mount')!.append(panel);
  const run = panel.querySelector('button')!;
  const output = panel.querySelector('output')!;
  run.addEventListener('click', () => {
    run.disabled = true;
    const list = document.querySelector('[data-list-id="chat-messages"]')!;
    list.innerHTML = messageMarkup(91, '이미지 로딩', '') + messageMarkup(92, '스티커 로딩', '')
      + messageMarkup(93, '본문 유지', '설명 문구는 로딩 중에도 그대로 표시합니다.')
      + messageMarkup(94, '파일 유지', '');
    list.querySelector('#chat-messages-1000-94 .accessories_fixture')!.innerHTML = '<div class="attachmentContainer_fixture"><a href="#download" aria-label="보고서.txt">보고서.txt</a></div>';
    const imageRow = list.querySelector<HTMLElement>('#chat-messages-1000-91')!;
    const stickerRow = list.querySelector<HTMLElement>('#chat-messages-1000-92')!;
    const heights: number[][] = [];
    let frame = 0;
    const tick = () => {
      if (frame === 0) {
        imageRow.style.height = '340px';
        imageRow.querySelector<HTMLElement>('.message_fixture')!.style.height = '320px';
        imageRow.querySelector('.accessories_fixture')!.innerHTML = '<div class="mosaicContainer_fixture" style="height:320px;min-height:320px;display:grid;grid-template-rows:320px"><div class="mosaicItem_fixture" style="height:320px"><div class="imageWrapper_fixture" style="width:240px;height:240px"></div></div></div>';
        stickerRow.querySelector('.accessories_fixture')!.innerHTML = '<div class="stickerContainer_fixture" style="height:160px;min-height:160px"><span class="clickableSticker_fixture" role="button" aria-label="로딩 스티커" style="display:block;height:160px"></span></div>';
      }
      if (frame === 12 || frame === 30) {
        const old = imageRow.querySelector('.imageWrapper_fixture')!;
        const next = document.createElement('div'); next.className = 'imageWrapper_fixture';
        next.innerHTML = `<img alt="샘플 이미지" src="${sampleImage}" width="240" height="100">`;
        old.replaceWith(next);
      }
      if (frame === 24 || frame === 42) {
        const target = stickerRow.querySelector('.clickableSticker_fixture')!;
        target.innerHTML = '<div class="stickerAsset_fixture" style="width:160px;height:160px"><canvas width="160" height="160"></canvas></div>';
      }
      heights.push([imageRow.getBoundingClientRect().height, stickerRow.getBoundingClientRect().height]);
      if (++frame < 60) requestAnimationFrame(tick);
      else {
        output.dataset.samples = JSON.stringify(heights);
        output.textContent = `완료: 이미지 최대 ${Math.max(...heights.map(h => h[0]))}px / 스티커 최대 ${Math.max(...heights.map(h => h[1]))}px`;
        run.disabled = false;
      }
    };
    requestAnimationFrame(tick);
  });
}
