import './native.css';
import { SheetcordController } from '../src/controller';
import { defaults, sanitizeSettings, type Settings, type SettingsStore } from '../src/settings';
import { fixtureMarkup, messageMarkup } from '../tests/fixture';

// Offline fixture only. This page never authenticates or connects to Discord.
history.replaceState(null, '', '/channels/100/1000');
document.body.innerHTML = fixtureMarkup();
document.body.classList.add('demo-mode');
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
const editor = document.querySelector<HTMLElement>('[contenteditable="true"]')!;
const form = document.querySelector('form')!;
const list = document.querySelector('[data-list-id="chat-messages"]')!;
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
demo.innerHTML = '<summary>샘플 도구</summary><p>샘플 데이터 · 실제 디스코드 연결 없음</p><button data-demo="reset">엑셀 화면 켜기</button><button data-demo="receive">새 메시지 수신</button><button data-demo="older">과거 메시지 로딩</button><button data-demo="long-tabs">서버 탭 15개 추가</button><button data-demo="break">화면 구조 변경 재현</button><button data-demo="repair">구조 복구 및 재시도</button>';
document.body.append(demo);
demo.addEventListener('click', event => {
  const action = (event.target as HTMLElement).dataset.demo;
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
