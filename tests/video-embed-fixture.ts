import { messageMarkup } from './fixture';

/** Observed Discord preview -> iframe replacement, with local-only media. */
export function addVideoEmbedFixture() {
  const list = document.querySelector('[data-list-id="chat-messages"]')!;
  list.innerHTML = messageMarkup(901, '샘플 사용자', '유튜브 영상 샘플', { reaction: true })
    + messageMarkup(902, 'Long author name wrapping across lines', '', { image: true });
  list.querySelector('#chat-messages-1000-902 .message_fixture')?.setAttribute('data-list-item-id', 'chat-messages___902');
  const accessories = list.querySelector('.accessories_fixture')!;
  const reactions = accessories.querySelector('.reactions_fixture')!;
  accessories.innerHTML = `<article class="embedFull_fixture"><div class="grid_fixture">
    <div class="embedSuppressButton_fixture" role="button" tabindex="0" aria-label="모든 임베드 제거하기"><svg width="16" height="16"></svg></div>
    <div class="embedProvider_fixture">YouTube</div><div class="embedTitle_fixture">영상 재생 점검</div>
    <div class="embedVideo_fixture embedMedia_fixture" style="max-width:400px">
      <div class="imageContainer_fixture"><div class="imageWrapper_fixture"><img alt="영상 미리보기" width="400" height="225" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect width='400' height='225' fill='%23dce8df'/%3E%3C/svg%3E"></div></div>
      <div class="embedVideoActions_fixture"><div class="wrapper_fixture"><div role="button" tabindex="0" aria-label="게임 시작"><svg width="16" height="16"></svg></div></div></div>
    </div></div></article>`;
  accessories.append(reactions);
  const play = accessories.querySelector<HTMLElement>('[aria-label="게임 시작"]')!;
  play.addEventListener('click', () => {
    const preview = accessories.querySelector('[class*="embedVideo_"]')!;
    const player = document.createElement('div');
    player.className = 'embedMedia_fixture';
    player.innerHTML = '<div class="embedVideo_fixture" style="padding-bottom:56.25%;max-width:400px"><iframe title="샘플 영상 뷰어" width="400" height="225" src="about:blank" style="position:absolute"></iframe></div>';
    preview.replaceWith(player);
  });
  return accessories;
}
