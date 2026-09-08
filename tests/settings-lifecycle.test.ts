import { afterEach, expect, it, vi } from 'vitest';
import { chromeSettings, defaults, settingsKey } from '../src/settings';
import { SheetcordController } from '../src/controller';
import { fixtureMarkup } from './fixture';

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); document.head.replaceChildren(); });

function mockStorage() {
  const event = { addListener: vi.fn(), removeListener: vi.fn() };
  const api = { storage: { onChanged: event, local: { get: vi.fn().mockResolvedValue({ [settingsKey]: defaults }) } } };
  vi.stubGlobal('chrome', api);
  return { api, event };
}

it('unsubscribes once from the registered event after chrome.storage disappears', () => {
  const { event } = mockStorage(); const listener = vi.fn();
  const unsubscribe = chromeSettings().subscribe(listener);
  const handler = event.addListener.mock.calls[0][0];
  handler({[settingsKey]: {newValue: {showEmoji:true}}}, 'local');
  expect(listener).toHaveBeenCalledWith({...defaults,showEmoji:true});
  vi.stubGlobal('chrome', {});
  expect(() => { unsubscribe(); unsubscribe(); }).not.toThrow();
  expect(event.removeListener).toHaveBeenCalledExactlyOnceWith(handler);
  handler({[settingsKey]: {newValue: defaults}}, 'local');
  expect(listener).toHaveBeenCalledTimes(1);
});

it('finishes page teardown when the retained event throws context invalidated', async () => {
  const { event } = mockStorage(); document.body.innerHTML = fixtureMarkup();
  history.replaceState(null, '', '/channels/100/1000');
  const controller = new SheetcordController(chromeSettings()); await controller.start();
  await vi.waitFor(() => expect(document.querySelector('.sc-header')).not.toBeNull());
  event.removeListener.mockImplementation(() => { throw new Error('Extension context invalidated.'); });
  vi.stubGlobal('chrome', {});
  expect(() => { controller.destroy(); controller.destroy(); }).not.toThrow();
  expect(event.removeListener).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[data-sc-owned]')).toBeNull();
  expect(document.documentElement.hasAttribute('data-sc-active')).toBe(false);
});

it('shows a recovery notice instead of rejecting startup when the storage event is missing', async () => {
  vi.stubGlobal('chrome', {}); document.body.innerHTML = fixtureMarkup();
  const controller = new SheetcordController(chromeSettings());
  await expect(controller.start()).resolves.toBeUndefined();
  expect(document.querySelector('[role="status"]')?.textContent).toContain('디스코드 페이지를 새로고침');
  expect(document.querySelector('.sc-header')).toBeNull(); controller.destroy();
});

it('does not resurrect a notice after the page closes while settings are loading', async () => {
  const { api } = mockStorage(); let reject!: (error: Error) => void;
  api.storage.local.get.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  const controller = new SheetcordController(chromeSettings()); const started = controller.start();
  controller.destroy(); reject(new Error('Extension context invalidated.')); await started;
  expect(document.querySelector('[data-sc-owned]')).toBeNull();
});
