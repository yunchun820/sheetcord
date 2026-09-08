/** Native global actions live outside the extension's ribbon. */
export function addTopbarFixture() {
  const existing = document.querySelector<HTMLElement>('.trailing_topbarFixture');
  if (existing) return existing;
  const trailing = document.createElement('div');
  trailing.className = 'trailing_topbarFixture';
  trailing.innerHTML = '<button type="button" aria-label="받은 편지함"><svg width="24" height="24"></svg></button><button type="button" aria-label="도움말"><svg width="24" height="24"></svg></button>';
  document.querySelector('#app-mount')!.append(trailing);
  trailing.addEventListener('click', event => {
    const control = (event.target as Element).closest('button');
    if (!control) return;
    const panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `${control.getAttribute('aria-label')} 샘플`);
    panel.style.cssText = 'position:fixed;top:160px;right:12px;padding:16px;background:white;border:1px solid #bdcbbf;z-index:200';
    const label = document.createElement('p');
    label.textContent = `${control.getAttribute('aria-label')} 샘플 동작`;
    const close = document.createElement('button');
    close.textContent = '닫기';
    close.addEventListener('click', () => panel.remove());
    panel.append(label, close);
    document.querySelector('#app-mount')!.append(panel);
  });
  return trailing;
}
