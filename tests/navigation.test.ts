import { afterEach, expect, it, vi } from 'vitest';
import { NavigationMenu } from '../src/navigation';

let menu: NavigationMenu;
afterEach(() => { menu?.close(false); document.body.replaceChildren(); });
const setup = () => {
  menu = new NavigationMenu('서버 목록', () => {});
  document.body.append(menu.opener);
};

it('filters full names, reflects unread/selected state and activates the latest source', () => {
  setup();
  const old = vi.fn(); const current = vi.fn();
  menu.update([{ key: 'a', label: '긴 서버 이름 개발 이야기', selected: true, unread: true, activate: old }, { key: 'b', label: '다른 서버', selected: false, activate: vi.fn() }]);
  menu.opener.click();
  const input = document.querySelector<HTMLInputElement>('.sc-navigation-search')!;
  input.value = '개발'; input.dispatchEvent(new Event('input'));
  expect(document.querySelectorAll('.sc-navigation-item')).toHaveLength(1);
  const item = document.querySelector<HTMLButtonElement>('.sc-navigation-item')!;
  expect(item.getAttribute('aria-current')).toBe('page');
  expect(item.querySelector('[aria-label="읽지 않은 메시지"]')).not.toBeNull();
  menu.update([{ key: 'a', label: '긴 서버 이름 개발 이야기', selected: true, unread: true, activate: current }, { key: 'b', label: '다른 서버', selected: false, activate: vi.fn() }]);
  expect(document.querySelector('.sc-navigation-item')).toBe(item);
  item.click();
  expect(current).toHaveBeenCalledTimes(1); expect(old).not.toHaveBeenCalled();
  expect(document.querySelector('.sc-navigation-panel')).toBeNull();
});

it('supports keyboard focus, Escape, outside dismissal and empty searches', () => {
  setup();
  menu.update([{ key: 'a', label: '첫 서버', selected: false, activate: vi.fn() }]);
  menu.opener.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  const input = document.querySelector<HTMLInputElement>('.sc-navigation-search')!;
  expect(document.activeElement).toBe(input);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(document.activeElement).toBe(document.querySelector('.sc-navigation-item'));
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(document.activeElement).toBe(menu.opener);
  expect(menu.opener.getAttribute('aria-expanded')).toBe('false');
  menu.opener.click();
  const search = document.querySelector<HTMLInputElement>('.sc-navigation-search')!;
  search.value = '없는 항목'; search.dispatchEvent(new Event('input'));
  expect(document.querySelector('.sc-navigation-empty')!.textContent).toContain('일치하는 항목이 없습니다');
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  expect(document.querySelector('.sc-navigation-panel')).toBeNull();
});

it('retains search and focused entries through live updates and closes on focus leaving', () => {
  setup();
  menu.update([{ key: 'a', label: '서버 A', selected: false, activate: vi.fn() }]);
  menu.opener.click();
  document.querySelector<HTMLButtonElement>('.sc-navigation-item')!.focus();
  menu.update([{ key: 'a', label: '서버 A', selected: true, activate: vi.fn() }]);
  expect((document.activeElement as HTMLElement).dataset.scNavigationKey).toBe('a');
  const outside = document.createElement('button'); document.body.append(outside); outside.focus();
  expect(document.querySelector('.sc-navigation-panel')).toBeNull();
  expect(document.activeElement).toBe(outside);
});
