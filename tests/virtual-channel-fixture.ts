export function addVirtualChannelFixture() {
  const sidebar = document.querySelector<HTMLElement>('[aria-label="채널"]')!;
  sidebar.querySelectorAll('a').forEach(link => link.remove());
  const scroller = document.createElement('div');
  scroller.className = 'scroller_virtual'; scroller.style.cssText = 'height:160px;overflow-y:auto;position:relative';
  const content = document.createElement('div'); content.style.cssText = 'height:1200px;position:relative';
  scroller.append(content); sidebar.prepend(scroller);
  const render = () => {
    const start = Math.floor(scroller.scrollTop / 40);
    content.innerHTML = Array.from({length: Math.min(5,30-start)}, (_,i)=>start+i).map(index =>
      `<a href="/channels/100/${9000+index}" style="position:absolute;top:${index*40}px;height:40px;left:0;right:0"><span class="name_virtual">가상 채널 ${String(index+1).padStart(2,'0')}</span></a>`).join('');
  };
  scroller.addEventListener('scroll',render); scroller.scrollTop = 400; render();
}
