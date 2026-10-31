# PROJECT DUEL — 온라인 1대1 3D FPS V0.1.2

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
Vite 개발 서버가 Socket.IO와 `/api/health` 요청을 전용 게임 포트 `localhost:43171`(Node 서버)로 프록시합니다. 이전 3001번 포트의 다른 서버에 잘못 연결되는 문제를 방지하기 위한 설정입니다.

`http://localhost:43171/api/health` 에 접속하면 `service: project-duel`, `protocol: 2`, `version: 0.1.2`가 포함된 JSON이 보여야 합니다.

**전장 생성이 안 되면** 노트북의 기존 `npm run dev`를 `Ctrl+C`로 중지하고 `git pull --ff-only origin feat/online-fps-mvp-v0.1` 후 `npm run dev`를 다시 실행하세요. 개발 서버를 재시작해야 Vite 프록시 포트 변경이 적용됩니다. 포트가 이미 사용 중이면 해당 프로세스를 확인하세요.

    npm run check   # 규칙 테스트와 웹 빌드
    npm run build
    npm run start   # dist 웹 클라이언트 + 온라인 서버

npm start 기본 포트는 43171이며 Render 등에서는 `PORT` 환경변수로 변경됩니다. 로컬에서는 `GAME_PORT`로 서버/Vite 프록시 포트를 함께 변경할 수 있습니다.

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

## V0.1.3 렌더링 최적화 패치 (검토 브랜치)

- 기존 무기/HP/충돌/서버 대전 규칙 불변
- 그래픽 품질 선택(성능 우선·균형·고화질), 픽셀 밀도 상한 제어
- 성능 우선: 그림자 OFF, DPR 최대 1 / 균형: 최대 1.25 / 고화질: 최대 1.6
- 정적 전장 React.memo, 매 프레임 카메라 Vector3 할당 제거
- 서버 스냅샷(약 15Hz)을 받는 상대 플레이어를 화면에서만 부드럽게 보간
- 보간 수학 단위 테스트 + 실제 브라우저 품질 선택/전장 생성 테스트
- Render 자동 배포 없음. 사용자 승인 전 공개 버전 변경 금지

**성능 개선 폭은 실제 대상 PC에서 측정 전에는 검증되지 않았습니다.**
