export function addAudioMenuFixture() {
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;left:12px;bottom:98px;z-index:400';
  layer.innerHTML = `<div role="menu" id="audio-device-context" style="width:222px;height:200px;background:white;border:1px solid #c8d0ca">
    <div role="group"><div role="menuitem" aria-haspopup="true">출력 장치</div>
      <div data-popover-layer="true" style="position:fixed;left:0;top:0;transform:translate(295.2px,612px)">
        <div class="submenuPaddingContainer_fixture" style="padding:0 8px"><div role="menu" class="submenu_fixture" style="width:420px;background:white">
          ${Array.from({ length: 12 }, (_, i) => `<div role="menuitemradio" aria-checked="${i === 0}" tabindex="-1">${i === 11 ? '마지막 장치' : `장치 ${i + 1} · 긴 오디오 인터페이스 이름`}</div>`).join('')}
        </div></div>
      </div>
    </div><div role="menuitem">출력 음량 100%</div>
  </div>`;
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') layer.remove(); });
  document.querySelector('#app-mount')!.append(layer);
}
