/** Synthetic regression shapes observed in Discord; no account content or URLs. */
export function addAppearanceFixture(root: Element) {
  const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="red"/%3E%3C/svg%3E';
  const panel = document.createElement('section');
  panel.className = 'theme-dark appearance-audit';
  panel.style.cssText = 'position:absolute;inset:0 0 0 204px;overflow:auto;background:#151515;z-index:20;padding:20px';
  panel.innerHTML = `<div class="notice_fixture" style="background:#222;color:white">앱 다운로드 <i class="iconWindows_fixture"></i></div>
    <div class="tabBar_fixture"><button role="tab" aria-selected="true">친구</button><button role="tab">모두</button></div>
    <main class="peopleColumn_fixture">
      <h2 style="color:white">이름 · 상태 · 작업</h2>
      <div class="peopleListItem_fixture"><span style="color:white">테스트 사용자</span> <span>상태 👍</span><img src="${image}" class="emoji"><button aria-label="대화 열기"><svg width="20" height="20"><circle r="8" cx="10" cy="10"/></svg></button></div>
      <div class="nowPlayingColumn_fixture">게임 활동 카드<img src="${image}"></div>
      <div role="dialog" class="theme-dark modal_fixture" style="background:#121212;border-radius:18px;padding:20px;margin-top:20px">
        <h2>설정 대화상자</h2><p>소개 🌿 <code>코드 👍</code></p><img class="avatar_fixture" src="${image}"><img src="${image}"><canvas width="48" height="48"></canvas><video controls poster="${image}"></video>
        <label>이름 <input value="편집 가능한 텍스트"></label><button aria-label="설정 닫기"><svg width="20" height="20"><path d="M0 0L20 20M20 0L0 20"/></svg></button>
        <div role="menu"><button role="menuitem">행 복사</button><button role="menuitem">행 편집</button></div>
      </div>
    </main>`;
  root.append(panel);
  return panel;
}
