import { chromeSettings, type Settings } from './settings';

const store = chromeSettings();
const status = document.querySelector<HTMLElement>('#status')!;
const keys = ['enabled', 'showAvatars', 'showEmoji', 'showImages', 'sidebarCollapsed'] as const;
const tabTitle = document.querySelector<HTMLInputElement>('#tabTitle')!;
const render = (settings: Settings) => {
  for (const key of keys) (document.getElementById(key) as HTMLInputElement).checked = settings[key];
  if (document.activeElement !== tabTitle) tabTitle.value = settings.tabTitle;
};
void store.read().then(render).catch(() => { status.textContent = '설정을 읽지 못했습니다. 확장 프로그램을 다시 로드해 주세요.'; });
const unsubscribe = store.subscribe(render);
window.addEventListener('pagehide', unsubscribe, { once: true });
document.getElementById('tab-settings')!.addEventListener('submit', async event => {
  event.preventDefault();
  const save = document.querySelector<HTMLButtonElement>('#save-tab-title')!;
  save.disabled = true;
  try {
    await store.write({ tabTitle: tabTitle.value });
    status.textContent = '탭 이름을 저장했습니다. Sheetcord가 켜진 디스코드 탭에 적용됩니다.';
  } catch { status.textContent = '탭 이름을 저장하지 못했습니다. 다시 시도해 주세요.'; }
  finally { save.disabled = false; }
});
for (const key of keys) document.getElementById(key)!.addEventListener('change', async event => {
  const input = event.target as HTMLInputElement;
  try {
    await store.write({ [key]: input.checked });
    status.textContent = '설정을 저장했습니다. 열려 있는 디스코드 채팅에 적용됩니다.';
  } catch { input.checked = !input.checked; status.textContent = '저장하지 못했습니다. 다시 시도해 주세요.'; }
});
document.getElementById('retry')!.addEventListener('click', async event => {
  const control = event.target as HTMLButtonElement;
  control.disabled = true;
  try {
    await store.write({ enabled: true });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    await chrome.tabs.sendMessage(tab.id, { type: 'sheetcord:retry' });
    status.textContent = '다시 적용을 요청했습니다. 채팅 화면을 확인해 주세요.';
  } catch { status.textContent = '디스코드 웹 채팅을 연 뒤 페이지를 한 번 새로고침하고 다시 시도해 주세요.'; }
  finally { control.disabled = false; }
});
