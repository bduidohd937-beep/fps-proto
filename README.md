# PROJECT DUEL — 온라인 1대1 3D FPS V0.1

브라우저 링크와 6자리 초대 코드를 공유해 친구와 실시간으로 대결하는 FPS 프로토타입입니다. PC 두 대로 플레이하는 것을 권장합니다.

## 주요 기능
- React + Vite + Three.js (React Three Fiber) 3D 전장과 엄폐물
- WASD 이동, Shift 달리기, 마우스 조준/사격, R 장전, ESC 커서 해제
- Socket.IO 기반 2인 방 생성/초대/입장/상태 동기화
- 서버 권한 이동·탄약·사격·엄폐물 관통 방지·HP·승패 판정
- 체력 100 / 총알 24발 / 4발 처치 / 먼저 5킬 승리
- 사망 후 부활, 승리 화면, 재대전

## 로컬 실행

Node.js 20 이상 필요.

    npm install
    npm run dev

브라우저에서 http://localhost:5173 접속.
Vite 개발 서버가 Socket.IO 연결을 localhost:3001(Node 서버)로 프록시합니다.

    npm run check   # 규칙 테스트와 웹 빌드
    npm run build
    npm run start   # dist 웹 클라이언트 + 온라인 서버

npm start 기본 포트는 3001이며 PORT 환경변수로 변경할 수 있습니다.

## 원격 친구 대전

localhost는 다른 인터넷의 친구가 접속할 수 없습니다.
WebSocket 지원 **Node.js 웹 서비스**(예: Render Web Service)에 배포하세요.

- Build: npm install && npm run build
- Start: npm start
- Node: 20 이상
- PORT: 호스팅 환경변수 사용

배포된 동일한 사이트를 두 명이 열고 한 명은 방을 만들고 다른 사람은 링크/방 코드를 입력합니다.
정적 웹 호스팅(GitHub Pages 등)만으로는 멀티플레이 서버가 작동하지 않습니다.

## 주요 파일
- shared/rules.js: 양쪽에서 공유하는 물리·사격·엄폐물 규칙
- server/index.js: 서버 권한 게임 룸과 판정
- src/components/GameScene.jsx: 3D 경기장 및 입력
- src/App.jsx: 대기실과 HUD
- tests/rules.test.js: 핵심 규칙 단위 테스트

## 현재 한계 및 주의 사항

프로토타입 수준입니다. 정교한 지연 보정, 완전한 치트 방지, 모바일 터치 조작, 재접속 복원, 확장성은 미구현입니다. 경기 정보는 서버 메모리에만 존재하여 서버 재시작 시 사라집니다.
