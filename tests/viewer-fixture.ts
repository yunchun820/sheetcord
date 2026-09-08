import { sampleImage, sampleAvatar } from './fixture';

export function addViewerFixture() {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', '미디어 뷰어 모달');
  dialog.style.zIndex = '400';
  dialog.innerHTML = `<div class="carouselModal_viewer" style="margin:36px 24px;box-sizing:content-box"><div class="topBar_viewer"><span>샘플 작성자 · 첨부 이미지</span><div class="actionButtons_viewer"><button>확대하기</button><button>브라우저로 열기</button><button aria-label="뷰어 닫기">닫기</button></div></div><div class="mediaArea_viewer"><div><div><div class="imageWrapper media_viewer"><div class="loadingOverlay_viewer"><img src="${sampleImage}" width="1140" height="855"></div></div></div></div></div></div>`;
  dialog.querySelector('.topBar_viewer')!.insertAdjacentHTML('afterbegin', `<svg class="viewerAvatarFixture" width="40" height="40" viewBox="0 0 40 40"><foreignObject width="40" height="40"><div class="avatarStack_viewer"><img class="avatar_viewer" src="${sampleAvatar}" width="40" height="40" alt="샘플 작성자 사진"></div></foreignObject></svg>`);
  dialog.querySelector('[aria-label="뷰어 닫기"]')!.addEventListener('click', () => dialog.remove());
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape') dialog.remove(); });
  document.querySelector('#app-mount')!.append(dialog);
}
