import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { ChannelScanner } from '../src/channel-scan';

let scanner: ChannelScanner;
let sidebar: HTMLElement;
let top: number;
beforeEach(() => {
  scanner = new ChannelScanner(); top = 350;
  history.replaceState(null, '', '/channels/100/1');
  document.body.innerHTML = '<nav style="overflow-y:auto"></nav>';
  sidebar = document.querySelector('nav')!;
  Object.defineProperties(sidebar, {
    clientHeight: { value: 200 }, scrollHeight: { value: 1000 },
    scrollTop: { get: () => top, set: value => { top = value; render(); } },
  });
  render();
});
function render() {
  sidebar.innerHTML = Array.from({ length: 2 }, (_, offset) => Math.floor(top / 100) + offset)
    .map(id => `<a href="/channels/100/${id}">채널 ${id}</a>`).join('');
}
const collect = () => [...sidebar.querySelectorAll('a')].map(source => ({ key: source.getAttribute('href')!, label: source.textContent!, selected: false, source }));
afterEach(() => { scanner.clear(); document.body.replaceChildren(); });

it('collects every virtual channel in order and restores the original scroll offset', async () => {
  const finish = vi.fn();
  scanner.scan(sidebar, '100', () => collect().reverse(), finish);
  await vi.waitFor(() => expect(finish).toHaveBeenCalledOnce(), { timeout: 2000 });
  expect(finish.mock.calls[0][0].map((entry: {label: string}) => entry.label)).toEqual(Array.from({length:10},(_,i)=>`채널 ${i}`));
  expect(top).toBe(350); expect(sidebar.style.scrollBehavior).toBe('');
  expect(sidebar.hasAttribute('data-sc-channel-scanning')).toBe(false);
  expect(scanner.scan(sidebar, '100', collect, finish)).toBeUndefined();
});

it('cancels safely on route changes and never publishes the prior server list', async () => {
  const finish = vi.fn(); scanner.scan(sidebar, '100', collect, finish);
  history.replaceState(null, '', '/channels/200/1');
  await vi.waitFor(() => expect(sidebar.hasAttribute('data-sc-channel-scanning')).toBe(false));
  expect(finish).not.toHaveBeenCalled();
  expect(top).toBe(0);
});

it('scans the inner virtual list when the workspace wrapper also scrolls', async () => {
  const wrapper = document.createElement('aside');
  wrapper.style.overflowY = 'auto';
  Object.defineProperties(wrapper, { clientHeight: { value: 300 }, scrollHeight: { value: 500 } });
  sidebar.replaceWith(wrapper); wrapper.append(sidebar);
  const finish = vi.fn(); scanner.scan(wrapper, '100', collect, finish);
  await vi.waitFor(() => expect(finish).toHaveBeenCalledOnce(), { timeout: 2000 });
  expect(finish.mock.calls[0][0]).toHaveLength(10);
  expect(top).toBe(350); expect(wrapper.scrollTop).toBe(0);
});

it('restores immediately on cancellation and allows a fresh scan', async () => {
  const finish = vi.fn(); scanner.scan(sidebar, '100', collect, finish);
  scanner.clear(); expect(top).toBe(350);
  scanner.scan(sidebar, '100', collect, finish);
  await vi.waitFor(() => expect(finish).toHaveBeenCalledOnce(), {timeout:2000});
});
