import { sampleAvatar } from './fixture';
import { addDarkSidebarFixture } from './sidebar-fixture';

export function addAudioPanelFixture() {
  addDarkSidebarFixture();
  const panel = document.querySelector('[class*="panels_"]')!;
  const style = document.createElement('style');
  style.textContent = '.accountPopoutButtonWrapper_audio{display:flex;flex:1 1 0%}.accountPopoutButton_audio{position:absolute;inset:0;box-sizing:content-box}';
  document.head.append(style);
  const control = (label: string, extra = '', checked?: boolean) => `<button class="button_audio ${extra}" aria-label="${label}" ${checked === undefined ? '' : `aria-checked="${checked}"`}><div class="contents_audio"><svg width="20" height="20"></svg></div></button>`;
  panel.innerHTML = `<div class="container_audio"><div class="accountPopoutButtonWrapper_audio"><div class="accountPopoutButton_audio" role="button" tabindex="0" aria-label="프로필 및 상태 관리"></div><img class="avatar_audio" src="${sampleAvatar}" width="32" height="32"><div class="nameTag_audio">샘플 사용자</div></div><div class="buttons_audio"><div class="audioButtonParent_audio">${control('음소거', '', true)}${control('입력 옵션','buttonChevron_audio')}</div><div class="audioButtonParent_audio">${control('헤드셋 음소거','',false)}${control('출력 옵션','buttonChevron_audio')}</div>${control('사용자 설정')}</div></div>`;
  panel.addEventListener('click', event => {
    const button = (event.target as Element).closest('[aria-checked]');
    if (button) button.setAttribute('aria-checked', String(button.getAttribute('aria-checked') !== 'true'));
  });
}
