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

---

## FRONTLINE V0.2.2 — 통합 패치 미리보기

이 브랜치는 **기존 V0.1.3 최적화 패치 + V0.2.0~V0.2.2 핵심 기능**을 묶은 기능 개발 브랜치입니다.
기존 Render 공개 서버를 자동 변경하지 않습니다. 라이브 배포는 수동 승인 후에만 진행합니다.

### 새 조작법
| 키 | 동작 |
|---|---|
| WASD | 이동 |
| Shift | 전력질주 (걷기 5.2m/s / 달리기 7.2m/s) |
| Space | 실제 높이와 중력 판정이 있는 점프 |
| Ctrl 또는 C | 앉기 — 낮은 장애물 아래를 통과 |
| 마우스 | 시점 회전·사격, 누르고 있으면 자동 연사 |
| R | 재장전 |
| Esc | 마우스 커서 해제 |

### 새 전장
- **IRON DEPOT** 군수 물류기지: 세미 리얼리스틱 산업풍 컨테이너·화물·조명·표지
- 중앙 약 **2.6m** 높이의 고가 철제 통로와 양쪽의 계단
- 컨테이너, 낮은 엄폐물, 앉아 통과해야 하는 낮은 배관
- 공유 3D 충돌 데이터로 **서버와 렌더링 전장 크기를 일치**

### 실제 구현 범위
- 서버에서 y좌표/중력/점프/착지/계단/앉기/사격 높이를 관리하는 3D 규칙
- 클라이언트에서 동일 이동 규칙을 이용한 즉시 이동 예측 및 서버 보정
- 상대 캐릭터 위치·높이·앉기 시각화
- 기존 1대1 방 생성·코드 입장·재장전·피해·5킬 승리 유지
- 기존 V0.1.3 그래픽 품질(성능 우선·균형·고화질) 설정 포함

### 구현 제약
- 이번 묶음은 빠르게 플레이할 수 있도록 **공유 AABB/캡슐 발자국 기반 경량 3D 충돌**을 사용합니다.
- Rapier 물리 엔진, 복잡한 경사면, 차량 등은 아직 도입하지 않았습니다.
- 총기 상점·ADS·무기 4종·영구 계정·실사 3D 모델은 **이번 패치 범위 아님**.
- 내장 3D 형상 기반 산업풍 시각 개선이며 전문 제작 GLB/PBR 에셋 교체는 다음 단계 검토 사항입니다.
- 점프 및 상자 충돌 등은 자동 테스트가 있어도 **실제 두 사람이 플레이하며 검증**해야 합니다.
- 맵/물리 규칙은 아직 검토 단계이므로 플레이테스트 이후 변경될 수 있습니다.

### 실행
```powershell
git fetch origin
git switch feat/frontline-v0.2.2-bundled
git pull --ff-only origin feat/frontline-v0.2.2-bundled
npm install
npm run dev
```
게임: http://localhost:5173
서버 상태: http://localhost:43171/api/health (protocol 3, version 0.2.2)

### 검증
```bash
npm run check
npm run test:e2e
```
CI는 3D 이동/사격 단위 테스트와 Socket.IO 2인 동기화 및 Chromium 실제 브라우저 로비/점프/앉기를 검사합니다.
사용자 PC 실제 FPS 및 Render 인터넷 2인 대전은 별도 확인 필요합니다.

---

## FRONTLINE V0.2.3 전투 핵심 시스템 (별도 검토 브랜치)

- V0.2.2의 점프·앉기·전력질주·IRON DEPOT 맵·V0.1.3 최적화 유지
- 키 **1~4**: AR-4 돌격소총 / VXR-9 기관단총 / MKR-12 저격소총 / BR-7 전투소총 장착
- **마우스 오른쪽 버튼**: 정조준(ADS). FOV·총기 위치·서버 탄퍼짐 변화
- **마우스 왼쪽 버튼**: 총기별 연사력·발사 방식 적용(돌격/SMG 자동, 저격/전투소총 단발)
- **R**: 무기별 탄창·재장전 시간. 무기별 탄창 수량을 서버가 별도로 기억하며 교체 시 재장전 취소
- 서버의 서버 권한 명중 판정: 머리/몸통/다리 3종 히트존, 엄폐물 차단, 총기별 피해량·사거리·탄퍼짐·반동 누적
- 헤드샷 화면 표시, 선택 무기 HUD, 전투 중 장비 스왑 단축키
- 서버 `/api/health`: `protocol:4`, `version:"0.2.3"`

**범위 밖:** 실제 아이템 구매/영구 재화·스킨·계정 기능은 V0.2.4 후보. 무기는 플레이테스트를 위해 4종 모두 기본 이용 가능. 실측 게임 밸런스와 부정행위 대응, 지연 보정은 후속 검증 사항이다.

### 로컬 테스트
```powershell
git fetch origin
git switch feat/frontline-v0.2.3-combat
git pull --ff-only origin feat/frontline-v0.2.3-combat
npm install
npm run dev
```
게임: http://localhost:5173 / 서버 확인: http://localhost:43171/api/health

두 브라우저에서 같은 방 코드로 입장한 다음 키 1~4로 무기를 바꾸고 우클릭 정조준·발사·재장전·헤드샷을 확인한다. 기존 Render 공개 서비스는 이 기능 브랜치를 배포하지 않았으므로 변경되지 않는다.

---

## V0.3.0 P0 — isolated, non-gameplay foundation

Branch: `chore/frontline-v0.3.0-p0-foundation` (not merged, not deployed).
Builds on V0.2.3, preserving protocol 4, game rules, all 4 weapons and existing 1v1 play.

- Feature source directories `src/features/{arena,combat,lobby,match,modes,operators}` with public API entrypoints.
- Server pure player module `server/domain/players.js`; future bot runtime has a reserved directory.
- Shared `shared/version.js`, global read-only graphics presets and a safe asset catalog.
- Asset categories `public/assets/{operators,weapons,maps,audio,ui}`; no third-party binary assets added.
- Lobby's perpetual 100ms render timer replaced by a clock only active during actual countdowns.
- CI guard `npm run check:architecture` catches broken imports, forbidden cross-feature dependencies, duplicated or unsafe asset paths.
- Local version doctor: `npm run doctor` compares expected Git/health/version and detects stale Vite App code on localhost:5173.
- Architectural details: `docs/FRONTLINE-V0.3-P0-ARCHITECTURE.md`.
- Baseline vs local old V0.1.3 screenshot: `docs/FRONTLINE-V0.3-P0-AUDIT.md`.

No V0.3.0 main UI, bots, operator perks or new assets are implemented as part of P0.


---

## FRONTLINE REFORGED V0.3.0 P1+P2 developer preview

**Branch:** `feat/frontline-v0.3.0-p1-p2-lobby-solo` (independent preview, does not deploy to Render automatically).

- Cinematic olive/charcoal military operations lobby with 3D operator preview.
- `솔로 플레이` → choose rookie/regular bot → `AI 대전 시작` creates a server-authoritative match immediately; no friend required.
- `친구 대전` preserves 6-character private room invites. Waiting screen can switch to solo bot immediately. Solo invite codes cannot be joined by other sockets.
- `오퍼레이터` selector shows four cosmetic operators; character preview changes and choice is stored in the current browser. **No character combat bonuses yet**; all operators share the same combat stats/hitboxes.
- `무기고` displays available four guns; weapon changes remain 1–4 during live combat.
- Bot FSM uses patrol/search/alert/engage, simple cached 2D navigation for ground obstacles, line-of-sight-based targeting, real shared server shooting/reload rules, and two difficulty presets.
- Existing ONLINE 1v1, four weapons, jumping/crouch and IRON DEPOT remain intact.

### Run
```powershell
git fetch origin
git switch feat/frontline-v0.3.0-p1-p2-lobby-solo
git pull --ff-only origin feat/frontline-v0.3.0-p1-p2-lobby-solo
npm install
npm run dev
```

### Tests
```bash
npm run check
npm run test:e2e
npm run doctor
```

**Limitations:** AI pathfinding is first-pass ground grid routing, not a production navmesh; 2F traversal AI, advanced cooperative mode, permanent accounts, real matchmaking, operator stat perks and polished external character asset files are excluded. Real laptop gameplay/FPS and wide-area online latency need manual playtesting before Render deployment.
