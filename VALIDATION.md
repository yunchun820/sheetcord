# 0.2.52 탭 아이콘·이름 검증 (2026-09-08)

- TypeScript 검사와 자동 테스트 63개 통과. 탭 아이콘 링크 여러 개·추가·삭제·속성 변경, 사용자 지정 제목 유지, 기존 설정 마이그레이션, 빈 이름·80자 제한, 해제 시 최신 원래 제목·아이콘 복원을 포함합니다.
- 실제 팝업 HTML과 설정 코드를 사용하는 샘플 DOM 테스트에서 이름 저장·비우기와 기존 이모지 설정 보존을 확인했습니다.
- 로컬 Chromium 샘플에서 투명 SVG 아이콘 링크 적용, `업무 정리.xlsx` 제목 변경, 새로고침 후 저장 유지, 원래 화면 전환 후 샘플 제목·아이콘 복원을 확인했습니다.
- 이번 변경의 실제 Chrome·Edge Discord 탭 표시와 사이트 콘텐츠 보안 정책 호환성은 아직 확인하지 못했습니다. 기존 0.2.51 실제 검증 결과를 이번 기능 검증으로 간주하지 않습니다.

# 0.2.51 integration verification (2026-09-08)

- TypeScript check, 56 tests, production build and archive verification pass in the main repository checkout.
- Actual Chrome/Discord: channel shortcut cells render inside the ribbon (top 73.6px, bottom 125.6px within 66–148px at 2048px viewport width).
- With the sidebar collapsed, switching from a text channel to a forum and back works; the current-channel cell follows navigation. Sidebar visibility and all three media preferences were restored. No messages were sent.
- This verifies the channel-shortcut release fix, not completion of the full Excel-fidelity audit. Narrow layouts, all popup variants and real-world performance improvement still need further verification. Only channel links mounted in the native sidebar are available as shortcuts.
- Older observations below describe earlier builds and must not be read as current comprehensive coverage.

# Sheetcord 0.1.0 검증 기록

검증일: 2026-09-07. 이 문서는 **샘플 DOM에서 확인한 동작**과 **실제 디스코드에서 아직 확인하지 못한 동작**을 구분합니다.

## 자동 검증

- TypeScript 엄격 모드 타입 검사 및 자동 테스트 22개.
- Vitest + Happy DOM: 어댑터 탐색, 서버 순서·선택·읽지 않은 표시, 읽기 전용 대화, 인라인 편집기와 채팅 입력기 구분.
- 이미지 기본 접힘·개별 확장·전체 접기, 스포일러 미공개 유지, 가상 목록 노드 재삽입 시 상태 유지, 대화 이동 시 초기화.
- 유니코드·커스텀 이모지 대체, 복합 이모지·국기·키캡, 코드 보존, 원래 텍스트 노드·링크 보존, 반응 클릭 전달과 상태 갱신, 중복 표시층 방지.
- 새 메시지 처리, 로컬 행 번호 안정성, 채널 이동, 시트 클릭의 최신 원본 노드 사용.
- 비활성화 후 원래 DOM의 정확한 복원, 작성 중 텍스트 노드 보존, IME 조합 Enter와 Shift+Enter 이벤트를 가로채지 않음, 관찰 처리 중지.
- 구조 불일치 후 자동 복원·재시도, 설정 유지·재활성화, 미지 설정 필드 제거, 표시 설정 외 데이터 미저장, 최소 권한 선언.

실제 OS의 한글 IME를 재현한 테스트가 아니라 **조합 상태 키 이벤트가 방해받지 않는지** 확인한 테스트입니다.

## 브라우저에서 확인한 샘플 화면

Codex 내장 Chromium 브라우저, 1280 × 720 기준:

- 엑셀 리본·수식 입력줄·열 문자·시간·작성자·메시지 격자·하단 서버 시트 표시.
- 네이티브 입력줄이 헤더에 가려지지 않고 열 머리글과 겹치지 않음.
- 이미지 확장 높이 225px, 다음 메시지 행과 겹침 없음.
- 이모지 숨김 상태의 반응 클릭에서 `:thumbsup: 3` → `:thumbsup: 4` 확인.
- 전체 이미지 접기와 실제 샘플 검색 입력란의 표시·포커스 이동.
- 한글 두 줄 입력, Shift+Enter에서 전송하지 않음, Enter에서 두 줄 메시지 한 건 추가 및 입력줄 비워짐.
- DM 시트 이동, 왼쪽 채널 창 접기.
- 원래 화면 복원 시 추가 행·이모지·이미지 속성 및 도구 모음 제거, 원래 서버 탐색과 입력기 표시.
- 서버 시트 21개에서 가로 스크롤, 과거 메시지 추가 후 18개 행에서 겹침 없음.
- 화면 구조 변경 재현 시 자동으로 원래 화면 복원 및 재시도 안내 표시.

샘플 입력·반응은 로컬 DOM만 변경하며, 실제 대화 상대에게 보내지 않았습니다.

## 실제 계정 검증: 보류

`discord.com`을 브라우저로 열려는 단계에서 자동 승인 검토가 접근을 차단했습니다. 로그인된 계정과 비공개 Discord 콘텐츠를 브라우저 연결이 읽을 수 있는 권한 확대라는 이유였습니다. 다른 수단으로 우회하지 않았습니다.

따라서 아래 항목은 완료했다고 주장하지 않습니다.

- 현재 로그인된 실제 Discord DOM에 대한 선택자 호환성 및 실제 스크롤 가상화와의 상호작용.
- 크롬·엣지에 압축 해제 확장을 실제로 설치한 상태에서의 실행.
- 실제 계정의 서버·DM 수신·전송·답장·멘션·첨부·반응.
- Windows 한글 IME를 이용한 실제 입력, Discord 이미지 원본 보기·GIF 재생·스포일러 UI.
- 실제 Discord 업데이트 전후 복원 및 다시 적용.

다음 검증에는 사용자의 명시적인 `discord.com` 브라우저 접근 승인과 로그인된 페이지가 필요합니다. 실제 전송 테스트는 사용자가 지정하고 승인한 테스트 대화·문구에서만 진행합니다.
