import { build } from 'vite';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';

await build({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: true,
    lib: { entry: 'src/content.ts', name: 'Sheetcord', formats: ['iife'], fileName: () => 'content.js' },
    sourcemap: false,
  },
});
await build({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: { entry: 'src/popup.ts', name: 'SheetcordPopup', formats: ['iife'], fileName: () => 'popup.js' },
  },
});
await mkdir('dist', { recursive: true });
await Promise.all(['manifest.json', 'popup.html', 'popup.css'].map(file => copyFile(`public/${file}`, `dist/${file}`)));
await Promise.all(['README.md', 'VALIDATION.md'].map(file => copyFile(file, `dist/${file}`)));
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
if (manifest.permissions.join() !== 'storage') throw new Error('Unexpected permissions');
await writeFile('dist/설치안내.txt', `Sheetcord ${manifest.version}\n\n1. chrome://extensions 또는 edge://extensions 를 엽니다.\n2. 개발자 모드를 켭니다.\n3. 압축해제된 확장 프로그램을 로드합니다를 선택하고 이 폴더를 선택합니다.\n4. 디스코드 웹의 채팅 페이지를 새로고침합니다.\n5. 확장 아이콘에서 화면과 표시 설정을 변경할 수 있습니다.\n\n업데이트: 기존에 등록한 확장 폴더의 파일을 새 파일로 덮어쓴 뒤, 확장 관리 화면의 새로고침 버튼을 누르고 디스코드 페이지도 새로고침하세요.\n로그인 화면에서 로그인한 직후에는 채팅 페이지를 한 번 새로고침하세요.\n이 프로그램은 비공식이며 Discord 또는 Microsoft와 제휴하지 않습니다.\n실제 계정 호환성 검증 상태는 프로젝트의 VALIDATION.md를 확인하세요.\n`, 'utf8');
console.log('Extension ready: dist/');
