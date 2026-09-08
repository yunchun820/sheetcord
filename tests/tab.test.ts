import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TabController } from '../src/tab';
import { defaults, sanitizeSettings } from '../src/settings';

let tab: TabController;
beforeEach(() => {
  document.head.innerHTML = '<title>Discord</title><link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="32x32"><link rel="apple-touch-icon" href="/touch.png">';
  tab = new TabController();
});
afterEach(() => { tab.clear(); document.head.replaceChildren(); vi.unstubAllGlobals(); });

it('hides all tab icons and restores the exact native links and title', () => {
  document.head.insertAdjacentHTML('beforeend', '<link rel="shortcut ICON" href="/alternate.png">');
  const before = document.head.innerHTML;
  const icon = document.querySelector<HTMLLinkElement>('link')!;
  tab.start('업무 정리.xlsx');
  expect(document.title).toBe('업무 정리.xlsx');
  expect(icon.getAttribute('href')).toMatch(/^data:image\/svg\+xml,/);
  expect(document.querySelector('[rel="shortcut ICON"]')!.getAttribute('href')).toBe(icon.getAttribute('href'));
  expect(document.querySelector('[rel="apple-touch-icon"]')!.getAttribute('href')).toBe('/touch.png');
  tab.clear();
  expect(document.head.innerHTML).toBe(before);
  expect(document.querySelector('link')).toBe(icon);
});

it('holds the custom name through native updates and restores the latest native name and icon', async () => {
  const icon = document.querySelector<HTMLLinkElement>('link')!;
  tab.start('작업 노트');
  document.title = '(2) 일반 | Discord';
  icon.setAttribute('href', '/unread.png');
  icon.setAttribute('type', 'image/png');
  icon.setAttribute('sizes', '16x16');
  await vi.waitFor(() => expect(document.title).toBe('작업 노트'));
  expect(icon.getAttribute('href')).toMatch(/^data:/);
  tab.start('다른 이름');
  expect(document.title).toBe('다른 이름');
  tab.start('');
  expect(document.title).toBe('(2) 일반 | Discord');
  expect(icon.getAttribute('href')).toMatch(/^data:/);
  tab.clear();
  expect(icon.getAttribute('href')).toBe('/unread.png');
  expect(icon.type).toBe('image/png');
  expect(icon.getAttribute('sizes')).toBe('16x16');
  document.title = '사용자 원래 화면';
  icon.href = '/next.ico';
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(document.title).toBe('사용자 원래 화면');
  expect(icon.getAttribute('href')).toBe('/next.ico');
});

it('handles absent, removed and newly inserted icons without duplicate fallbacks', async () => {
  document.querySelector('link')!.remove();
  tab.start('문서');
  tab.start('문서');
  expect(document.querySelectorAll('.sc-favicon').length).toBe(1);
  document.querySelector('.sc-favicon')!.remove();
  await vi.waitFor(() => expect(document.querySelectorAll('.sc-favicon').length).toBe(1));
  const icon = document.createElement('link');
  icon.rel = 'icon'; icon.href = '/new.ico';
  document.head.append(icon);
  await vi.waitFor(() => expect(icon.getAttribute('href')).toMatch(/^data:/));
  expect(document.querySelector('.sc-favicon')).toBeNull();
  icon.rel = 'preload';
  await vi.waitFor(() => expect(icon.getAttribute('href')).toBe('/new.ico'));
  expect(document.querySelectorAll('.sc-favicon').length).toBe(1);
  tab.clear();
  expect(document.querySelector('.sc-favicon')).toBeNull();
});

it('preserves native changes arriving immediately before teardown', () => {
  tab.start('문서');
  document.title = '새 대화 | Discord';
  document.querySelector('link')!.setAttribute('href', '/latest.ico');
  tab.clear();
  expect(document.title).toBe('새 대화 | Discord');
  expect(document.querySelector('link')!.getAttribute('href')).toBe('/latest.ico');
});

it('migrates older settings and accepts an empty or bounded plain text title', () => {
  expect(sanitizeSettings({ showEmoji: true }).tabTitle).toBe(defaults.tabTitle);
  expect(sanitizeSettings({ tabTitle: false }).tabTitle).toBe(defaults.tabTitle);
  expect(sanitizeSettings({ tabTitle: '   ' }).tabTitle).toBe('');
  expect(sanitizeSettings({ tabTitle: ' 업무\n노트.xlsx ' }).tabTitle).toBe('업무 노트.xlsx');
  expect(sanitizeSettings({ tabTitle: '가'.repeat(100) }).tabTitle.length).toBe(80);
  tab.start('<b>업무</b>');
  expect(document.title).toBe('<b>업무</b>');
  expect(document.head.querySelector('b')).toBeNull();
});
