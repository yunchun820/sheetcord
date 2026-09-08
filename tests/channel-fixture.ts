/** Synthetic markup reproducing the observed nested channel and composer layout. */
export function addChannelAuditFixture() {
  for (const link of document.querySelectorAll('.channel-link')) {
    const label = link.querySelector('span');
    if (!label) continue;
    const text = label.textContent;
    label.className = 'name_audit';
    label.innerHTML = '<span class="nativeChannelTypography"></span>';
    label.firstElementChild!.textContent = text;
    const top = document.createElement('div');
    top.className = 'linkTop_audit';
    const icon = document.createElement('div');
    icon.className = 'iconContainer_audit';
    icon.innerHTML = '<svg width="24" height="24"></svg>';
    for (const node of [...link.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
    top.append(icon, ...link.childNodes);
    link.replaceChildren(top);
  }
  const attach = document.querySelector('.attachButton_fixture')!;
  attach.setAttribute('aria-label', '더 많은 메시지 옵션');
  attach.innerHTML = '<div class="buttonWrapper_audit attachButtonInner_audit"><svg width="20" height="20"></svg></div>';
  const wrapper = document.createElement('div');
  wrapper.className = 'attachWrapper_audit';
  attach.before(wrapper);
  wrapper.append(attach);
  const buttons = document.querySelector('.buttons_fixture')!;
  buttons.innerHTML = '<div role="button" tabindex="0" aria-label="이모지 추가"><div class="spriteContainer_audit"><div class="sprite_audit"></div></div></div>';
  const style = document.createElement('style');
  style.textContent = '.nativeChannelTypography{font-size:16px}.linkTop_audit{display:flex;gap:8px}.iconContainer_audit{width:24px;flex-shrink:0}.attachWrapper_audit{padding:12px 10px}.buttonWrapper_audit{height:32px;padding:6px}.spriteContainer_audit{width:18px;height:18px;background:red}';
  document.head.append(style);
}
