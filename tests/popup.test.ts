import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { defaults, settingsKey, type Settings } from '../src/settings';

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'));
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it('saves custom and empty tab names through the popup while retaining checkbox preferences', async () => {
  document.body.innerHTML = readFileSync('public/popup.html', 'utf8').split('<body>')[1].split('</body>')[0].replace('<script src="popup.js"></script>', '');
  let stored = { ...defaults };
  const listeners = new Set<(changes: Record<string, { newValue: Settings }>, area: string) => void>();
  vi.stubGlobal('chrome', { storage: {
    local: {
      get: async () => ({ [settingsKey]: { ...stored } }),
      set: async (value: Record<string, Settings>) => {
        stored = value[settingsKey];
        listeners.forEach(listener => listener({ [settingsKey]: { newValue: stored } }, 'local'));
      },
    },
    onChanged: { addListener: (listener: (changes: Record<string, { newValue: Settings }>, area: string) => void) => listeners.add(listener), removeListener: (listener: (changes: Record<string, { newValue: Settings }>, area: string) => void) => listeners.delete(listener) },
  } });
  await import('../src/popup');
  const input = document.querySelector<HTMLInputElement>('#tabTitle')!;
  await vi.waitFor(() => expect(input.value).toBe(defaults.tabTitle));
  input.value = '월간 정리.xlsx';
  document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await vi.waitFor(() => expect(stored.tabTitle).toBe('월간 정리.xlsx'));
  const emoji = document.querySelector<HTMLInputElement>('#showEmoji')!;
  emoji.checked = true;
  emoji.dispatchEvent(new Event('change', { bubbles: true }));
  await vi.waitFor(() => expect(stored.showEmoji).toBe(true));
  expect(stored.tabTitle).toBe('월간 정리.xlsx');
  input.value = '';
  document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await vi.waitFor(() => expect(stored.tabTitle).toBe(''));
  expect(stored.showEmoji).toBe(true);
  expect(document.querySelector('#status')!.textContent).toContain('탭 이름을 저장');
});
