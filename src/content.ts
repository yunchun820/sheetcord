import { SheetcordController } from './controller';
import { chromeSettings } from './settings';

let controller = new SheetcordController(chromeSettings());
void controller.start();
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === 'sheetcord:retry') { controller.retry(); reply({ ok: true }); }
});
window.addEventListener('pagehide', () => controller.destroy());
window.addEventListener('pageshow', event => {
  if (event.persisted) { controller = new SheetcordController(chromeSettings()); void controller.start(); }
});
