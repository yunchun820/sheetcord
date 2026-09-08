import { addAudioPanelFixture } from './audio-panel-fixture';
export function addVoiceFixture() {
  addAudioPanelFixture();
  const button = (label: string) => `<button aria-label="${label}"><svg width="24" height="24"></svg></button>`;
  document.querySelector('[class*="panels_"]')!.insertAdjacentHTML('afterbegin', `<div class="wrapper_voice"><div class="container_voice"><div class="connection_voice"><div class="rtcConnectionStatus_voice"><div class="rtcConnectionStatusLabel_voice">음성 연결됨</div><div>General / test</div></div><div class="voiceButtonsContainer_voice">${button('Krisp가 제공하는 잡음 제거')}${button('연결 끊기')}</div></div><div class="actionButtons_voice"><button aria-describedby="voice-camera"><svg></svg></button><span hidden id="voice-camera">카메라 켜기</span>${button('화면 공유하기')}</div></div></div>`);
  document.querySelector('main')!.innerHTML = `<div class="callContainer_voice"><div class="root_voice"><div class="videoControls_voice"><div class="bottomControls_voice">${button('음소거')}${button('카메라 켜기')}${button('화면 공유하기')}${button('연결 끊기')}</div></div><div class="videoGrid_voice"><div class="row_voice"><div class="tile_voice"><div class="overlayBottom_voice">참가자 A</div></div><div class="tile_voice"><div class="overlayBottom_voice">참가자 B</div></div></div></div></div></div>`;
  document.querySelector('#app-mount')!.insertAdjacentHTML('afterbegin','<div class="notice_voice">마이크 입력을 감지하지 못했습니다. 오류: 3002</div>');
  const grid = document.querySelector('.videoGrid_voice')!;
  const items = document.createElement('div');
  items.className = 'listItems_voice';
  items.append(...grid.childNodes);
  grid.append(items);
  for (const tile of grid.querySelectorAll('.tile_voice')) {
    const sizer = document.createElement('div');
    sizer.className = 'tileSizer_voice';
    sizer.append(...tile.childNodes);
    tile.append(sizer);
  }
  const style = document.createElement('style');
  style.textContent = '.callContainer_voice{background:black;flex:1}.tile_voice{height:400px;position:relative;background:#aaa}.row_voice{display:flex}.videoControls_voice{position:absolute;opacity:0}.connection_voice{display:flex}.voiceButtonsContainer_voice{display:flex}.notice_voice{background:#900}';
  document.head.append(style);
  style.textContent += '.root_voice{display:flex;align-items:center;justify-content:center;height:600px}.videoGrid_voice{height:600px}.listItems_voice{position:absolute;inset:64px 0 56px 8px}.tileSizer_voice{height:397px}.connection_voice{height:32px}.bottomControls_voice{opacity:0}';
}
