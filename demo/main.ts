import './native.css';
import { SheetcordController } from '../src/controller';
import { defaults, sanitizeSettings, type Settings, type SettingsStore } from '../src/settings';
import { addTopbarFixture } from '../tests/topbar-fixture';
import { fixtureMarkup, messageMarkup } from '../tests/fixture';
import { addDarkSidebarFixture } from '../tests/sidebar-fixture';
import { addAppearanceFixture } from '../tests/appearance-fixture';
import { addChannelAuditFixture } from '../tests/channel-fixture';
import { addMessageParityFixture } from '../tests/message-parity-fixture';
import { addAudioPanelFixture } from '../tests/audio-panel-fixture';
import { addVoiceFixture } from '../tests/voice-fixture';
import { addProfileFixture, addFullProfileFixture, addAccountProfileFixture } from '../tests/profile-fixture';
import { addPickerFixture, addReactionPickerFixture, addHeaderPanelFixture, addSearchFilterFixture, addContextMenuFixture, addMessageSubmenuFixture, addPostUploadFixture, addStickerRailFixture } from '../tests/picker-fixture';
import { addViewerFixture } from '../tests/viewer-fixture';
import { addSearchFixture } from '../tests/search-fixture';
import { addAudioMenuFixture } from '../tests/audio-menu-fixture';
import { addMediaDisplayFixture, addChromePolishFixture, addConcealRegressionFixture } from '../tests/media-display-fixture';

// Offline fixture only. This page never authenticates or connects to Discord.
const appearanceAudit = new URLSearchParams(location.search).has('appearance-audit');
const gridAudit = new URLSearchParams(location.search).has('grid-audit');
const channelAudit = new URLSearchParams(location.search).has('channel-audit');
const messageParity = new URLSearchParams(location.search).has('message-parity');
const audioPanel = new URLSearchParams(location.search).has('audio-panel');
const voicePanel = new URLSearchParams(location.search).has('voice-panel');
const profileAudit = new URLSearchParams(location.search).has('profile-audit');
const fullProfileAudit = new URLSearchParams(location.search).has('full-profile-audit');
const accountProfileAudit = new URLSearchParams(location.search).has('account-profile-audit');
const pickerAudit = new URLSearchParams(location.search).has('picker-audit');
const reactionAudit = new URLSearchParams(location.search).has('reaction-audit');
const headerPanelAudit = new URLSearchParams(location.search).has('header-panel-audit');
const filterAudit = new URLSearchParams(location.search).has('filter-audit');
const contextMenuAudit = new URLSearchParams(location.search).has('context-menu-audit');
const messageSubmenuAudit = new URLSearchParams(location.search).has('message-submenu-audit');
const postUploadAudit = new URLSearchParams(location.search).has('post-upload-audit');
const stickerRailAudit = new URLSearchParams(location.search).has('sticker-rail-audit');
const viewerAudit = new URLSearchParams(location.search).has('viewer-audit');
const searchAudit = new URLSearchParams(location.search).has('search-audit');
const audioMenuAudit = new URLSearchParams(location.search).has('audio-menu-audit');
const mediaDisplayAudit = new URLSearchParams(location.search).has('media-display-audit');
const chromePolishAudit = new URLSearchParams(location.search).has('chrome-polish-audit');
const concealRegression = new URLSearchParams(location.search).has('conceal-regression');
history.replaceState(null, '', '/channels/100/1000');
document.body.innerHTML = fixtureMarkup();
document.body.classList.add('demo-mode');
if (channelAudit) addChannelAuditFixture();
if (messageParity) addMessageParityFixture();
if (audioPanel) addAudioPanelFixture();
if (voicePanel) addVoiceFixture();
if (profileAudit) addProfileFixture();
if (fullProfileAudit) addFullProfileFixture();
if (accountProfileAudit) addAccountProfileFixture();
if (pickerAudit) addPickerFixture();
if (reactionAudit) addReactionPickerFixture();
if (headerPanelAudit) addHeaderPanelFixture();
if (filterAudit) addSearchFilterFixture();
if (contextMenuAudit) addContextMenuFixture();
if (messageSubmenuAudit) addMessageSubmenuFixture();
if (postUploadAudit) addPostUploadFixture();
if (stickerRailAudit) addStickerRailFixture();
if (viewerAudit) addViewerFixture();
if (searchAudit) addSearchFixture();
if (audioMenuAudit) addAudioMenuFixture();
if (mediaDisplayAudit) addMediaDisplayFixture();
if (chromePolishAudit) addChromePolishFixture();
if (concealRegression) addConcealRegressionFixture();
if (appearanceAudit) addAppearanceFixture(document.querySelector('#app-mount')!);
if (gridAudit) document.querySelector('[data-list-id="chat-messages"]')!.insertAdjacentHTML('afterbegin',
  messageMarkup(51, '아주 긴 이름도 셀 안에서 자연스럽게 줄바꿈되는 사용자', '짧은 본문') +
  messageMarkup(52, '셀 검증', '여러 줄의 긴 텍스트도 옆 셀로 넘어가지 않고 같은 셀 안에서 읽을 수 있어야 합니다. '.repeat(4) +
    '<br><a href="https://example.com">https://example.com/' + 'very-long-path-'.repeat(12) + '</a><pre>const longValue = "' + 'unbroken'.repeat(30) + '";</pre>'));
let settings = sanitizeSettings(JSON.parse(localStorage.getItem('sheetcord.demo.settings') || 'null'));
const listeners = new Set<(settings: Settings) => void>();
const store: SettingsStore = {
  read: async () => ({ ...settings }),
  write: async patch => {
    settings = { ...settings, ...patch };
    localStorage.setItem('sheetcord.demo.settings', JSON.stringify(settings));
    listeners.forEach(listener => listener(settings));
  },
  subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
const controller = new SheetcordController(store);
void controller.start();

const app = document.querySelector('#app-mount')!;
const editor = document.querySelector<HTMLElement>('[contenteditable="true"]') ?? document.createElement('div');
const form = document.querySelector('form') ?? document.createElement('form');
const list = document.querySelector('[data-list-id="chat-messages"]') ?? document.createElement('ol');
let composing = false;
let counter = 20;
let replyAuthor = '';

editor.addEventListener('compositionstart', () => { composing = true; });
editor.addEventListener('compositionend', () => { composing = false; });
editor.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || composing) return;
  event.preventDefault();
  const message = editor.innerText?.trim();
  if (!message) return;
  const escaped = document.createElement('span');
  escaped.textContent = message;
  list.insertAdjacentHTML('beforeend', messageMarkup(++counter, '나', escaped.innerHTML.replace(/\n/g, '<br>'), { reply: Boolean(replyAuthor) }));
  editor.replaceChildren();
  form.querySelector<HTMLElement>('.attachedBars_fixture')!.hidden = true;
  replyAuthor = '';
  const scroller = document.querySelector('.messages-scroller')!;
  requestAnimationFrame(() => { scroller.scrollTop = scroller.scrollHeight; });
});
form.addEventListener('submit', event => event.preventDefault());

app.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-list-item-id], a.channel-link, .attachButton_fixture');
  if (!target || target.closest('[data-sc-owned]')) return;
  if (target.dataset.action === 'reaction') {
    const count = target.querySelector('.reactionCount_fixture')!;
    const pressed = target.getAttribute('aria-pressed') === 'true';
    count.textContent = String(Number(count.textContent) + (pressed ? -1 : 1));
    target.setAttribute('aria-pressed', String(!pressed));
  }
  if (target.dataset.action === 'spoiler') { target.parentElement!.classList.add('revealed'); target.remove(); }
  if (target.dataset.action === 'reply') {
    replyAuthor = target.closest('li')?.querySelector('[id^="message-username-"]')?.textContent ?? '메시지';
    const bar = form.querySelector<HTMLElement>('.attachedBars_fixture')!;
    bar.textContent = `${replyAuthor}에게 답장 · 샘플`;
    bar.hidden = false;
    editor.focus();
  }
  if (target.dataset.action === 'emoji-picker') { editor.append('😊'); editor.focus(); }
  if (target.matches('.attachButton_fixture')) form.querySelector<HTMLInputElement>('input[type="file"]')!.click();
  if (target.hasAttribute('data-list-item-id') || target.matches('a.channel-link')) {
    event.preventDefault();
    const id = target.getAttribute('data-list-item-id')?.replace('guildsnav___', '');
    const path = id ? (id === 'home' ? '/channels/@me' : `/channels/${id}/1000`) : target.getAttribute('href')!;
    history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (id === 'home') {
      document.querySelector('.workspace-heading strong')!.textContent = '개인 메시지';
      document.querySelector('.channel-category')!.textContent = '최근 대화';
      for (const [index, link] of [...document.querySelectorAll<HTMLAnchorElement>('a.channel-link')].entries()) {
        link.href = `/channels/@me/${9000 + index}`;
        link.querySelector('span')!.textContent = ['지윤', '민수', '서연', '도현', '스터디 그룹', '수빈', '민지', '혜원'][index];
      }
    } else if (id) {
      document.querySelector('.workspace-heading strong')!.textContent = target.getAttribute('aria-label')!;
      for (const [index, link] of [...document.querySelectorAll<HTMLAnchorElement>('a.channel-link')].entries()) {
        link.href = `/channels/${id}/${1000 + index}`;
        link.querySelector('span')!.textContent = ['일반', '공지사항', '디자인 공유', '개발 논의', '레퍼런스', '팀 가이드', '잡담', '오늘의 음악'][index];
      }
    } else {
      for (const link of document.querySelectorAll('a.channel-link')) link.removeAttribute('aria-current');
      target.setAttribute('aria-current', 'page');
    }
  }
});
form.querySelector<HTMLInputElement>('input[type="file"]')!.addEventListener('change', event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const bar = form.querySelector<HTMLElement>('.attachedBars_fixture')!;
    bar.textContent = `첨부 선택: ${file.name} · 샘플에서는 업로드하지 않습니다.`;
    bar.hidden = false;
  }
});

const demo = document.createElement('details');
demo.className = 'demo-tools';
demo.innerHTML = '<summary>샘플 도구</summary><p>샘플 데이터 · 실제 디스코드 연결 없음</p><button data-demo="reset">엑셀 화면 켜기</button><button data-demo="receive">새 메시지 수신</button><button data-demo="older">과거 메시지 로딩</button><button data-demo="long-tabs">서버 탭 15개 추가</button><button data-demo="tab-labels">탭 이름 누락·긴 이름 재현</button><button data-demo="break">화면 구조 변경 재현</button><button data-demo="repair">구조 복구 및 재시도</button>';
document.body.append(demo);
const topbarDemo = document.createElement('button');
topbarDemo.textContent = '상단 받은 편지함·도움말 재현';
topbarDemo.addEventListener('click', () => addTopbarFixture());
demo.append(topbarDemo);
const demoTabForm = document.createElement('form');
demoTabForm.innerHTML = '<label for="demo-tab-title">탭 이름 샘플</label><input id="demo-tab-title" type="text" maxlength="80"><button type="submit">탭 이름 적용</button>';
const demoTabTitle = demoTabForm.querySelector<HTMLInputElement>('input')!;
demoTabTitle.value = settings.tabTitle;
demoTabForm.addEventListener('submit', event => { event.preventDefault(); void store.write({ tabTitle: demoTabTitle.value.trim() }); });
demo.append(demoTabForm);
const sidebarDemo = document.createElement('button');
sidebarDemo.textContent = '왼쪽 다크 테마·긴 채널명 재현';
sidebarDemo.dataset.demo = 'dark-sidebar';
demo.append(sidebarDemo);
const minuteDemo = document.createElement('button');
minuteDemo.textContent = '같은 분 메시지 재현';
minuteDemo.dataset.demo = 'same-minute';
demo.append(minuteDemo);
demo.addEventListener('click', event => {
  const action = (event.target as HTMLElement).dataset.demo;
  if (action === 'same-minute') {
    ['2026-09-07T00:31:01Z', '2026-09-07T00:31:59Z', '2026-09-07T00:32:00Z'].forEach((value, index) => {
      document.getElementById(`chat-messages-1000-${index + 1}`)?.querySelector('time')?.setAttribute('datetime', value);
    });
  }
  if (action === 'dark-sidebar') addDarkSidebarFixture();
  if (action === 'reset') void store.write({ ...defaults });
  if (action === 'receive') list.insertAdjacentHTML('beforeend', messageMarkup(++counter, '민수', '새 메시지가 도착했습니다! 실시간 수신 샘플이에요. 🎉', { reaction: true }));
  if (action === 'older') for (let i = 0; i < 6; i++) list.insertAdjacentHTML('afterbegin', messageMarkup(++counter, '도현', '이전 대화에서 불러온 메시지입니다.'));
  if (action === 'long-tabs') for (let i = 0; i < 15; i++) {
    const tab = document.createElement('button');
    tab.setAttribute('data-list-item-id', `guildsnav___${600 + i}`);
    tab.setAttribute('aria-label', `프로젝트 ${i + 1}`);
    tab.textContent = `P${i}`;
    document.querySelector('[data-list-id="guildsnav"]')!.append(tab);
  }
  if (action === 'tab-labels') {
    const sources = ['100', '200', '300', '400', '500'].map(id => document.querySelector<HTMLElement>(`[data-list-item-id="guildsnav___${id}"]`)!);
    for (const source of sources) { source.setAttribute('aria-label', ' \u200B '); source.replaceChildren(); }
    let label = document.getElementById('demo-server-label');
    if (!label) { label = document.createElement('span'); label.id = 'demo-server-label'; label.hidden = true; document.body.append(label); }
    label.textContent = '디자인 스튜디오 · 아주 긴 서버 이름도 마지막 글자까지 표시되는지 확인';
    sources[0].setAttribute('aria-labelledby', label.id);
    sources[1].innerHTML = '<span role="img" aria-label="사이드 프로젝트 · 아이콘에 연결된 이름"></span>';
    sources[2].setAttribute('title', '퇴근 후 모임 · 제목 속성');
    sources[3].innerHTML = '<img alt="개발 이야기 · 이미지 대체 이름">';
    // The fifth server intentionally has no retrievable name; its ID remains readable.
  }
  if (action === 'break') {
    const sidebar = document.querySelector('.sidebarList_fixture');
    sidebar?.classList.replace('sidebarList_fixture', 'unknownSidebar_fixture');
    sidebar?.setAttribute('aria-label', '알 수 없는 탐색');
  }
  if (action === 'repair') {
    const sidebar = document.querySelector('.unknownSidebar_fixture');
    sidebar?.classList.replace('unknownSidebar_fixture', 'sidebarList_fixture');
    sidebar?.setAttribute('aria-label', '채널');
    controller.retry();
  }
});
