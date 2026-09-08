import { sampleAvatar } from './fixture';

export function addSearchFixture() {
  const panel = document.createElement('section');
  panel.className = 'searchResultsWrap_fixture';
  panel.setAttribute('aria-label', '검색 결과 샘플');
  panel.style.cssText = 'position:fixed;right:12px;top:220px;width:min(420px,calc(100vw - 24px));max-height:calc(100vh - 284px);overflow:auto;z-index:400;background:white';
  panel.innerHTML = `<button aria-label="검색 샘플 닫기">닫기</button><ul style="padding:0;list-style:none">${[0, 1].map(n => `
    <li role="listitem" style="margin-bottom:8px"><div class="searchResult_fixture" role="button" tabindex="0"><div class="message_fixture">
      <div role="article" id="search-result-fixture-${n}">
        <div class="repliedMessage_fixture"><button>답장 작성자</button><span>답장 미리보기</span></div>
        <div class="contents_fixture"><img class="avatar_fixture" src="${sampleAvatar}" alt="샘플 사진">
          <h2 class="header_fixture"><span class="headerText_fixture"><button>아주 긴 작성자 이름</button></span><time>2026. 9. 8. 09:30</time></h2>
          <div class="messageContent_fixture">${n ? '짧은 메시지' : '공백없는긴메시지도셀안에서줄바꿈됩니다'.repeat(7)}</div>
        </div>
      </div></div></div></li>`).join('')}</ul>`;
  panel.querySelector('[aria-label="검색 샘플 닫기"]')!.addEventListener('click', () => panel.remove());
  document.querySelector('#app-mount')!.append(panel);
}
