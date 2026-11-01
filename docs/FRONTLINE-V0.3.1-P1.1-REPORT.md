# PROJECT DUEL FRONTLINE V0.3.1 P1.1 보고서

## 범위

- 기준: `feat/frontline-v0.3.1-p1-acceptance` / `937d1f0a0ee353e96d16b0b9d029153289e79bbd`
- 작업 브랜치: `feat/frontline-v0.3.1-p1-1-network-sensitivity`
- 기존 PR #8~#10, main, Render는 수정·병합·배포하지 않음
- 실행 환경: Windows, Chromium headless, Playwright 1.64.1, Node 24.21.0; CI 기준은 Node 22.23.4

## 실제 버그와 원인

### 친구 대전 timeout

재현된 20회 스트레스 실행의 초기 실패는 방 입장 서버 오류가 아니었다. Playwright trace에서 상대 브라우저는 `room-join-ack`와 `match-playing`까지 도달했고 scoreboard도 렌더링했다. 이후 호스트의 Space 고도 검증 또는 연속 무기 입력 검증이 timeout되었고, `finally`에서 상대 context를 닫으면서 호스트가 뒤늦게 “상대가 나갔습니다” 상태가 됐다.

수정은 timeout 증가나 재시도가 아니다. 테스트가 `data-input-ready`를 기다리고 host page를 전면화하며, 네트워크 입장 검증과 UI 무기 선택 검증을 분리하도록 했다. 수정 후 동일한 조건의 20회 반복은 20/20 통과했다.

### Z 입력과 CI run #41274649995

기존 실패는 `acceptance.spec.js`에서 Z 입력 직후 서버 자세가 지상으로 남는 입력 전달 경계 문제와 계측 준비 부족이 섞인 것이었다. 게임 씬이 준비되기 전 입력을 보내지 않도록 `data-input-ready`를 노출하고, Z 토글 시 다음 25Hz 송신을 기다리지 않고 현재 자세를 즉시 서버에 전송했다. 수정 후 Z 자세 E2E와 전체 회귀가 통과했다.

### CROUCH_SPEED 2.7 대 브라우저 3.48

실제 규칙의 `CROUCH_SPEED`는 2.7m/s이며 서버 이동 단위 테스트가 이를 보존한다. 기존 브라우저 3.48m/s 값은 서버 스냅샷 timestamp와 프레임 샘플을 섞어 계산한 계측 오차로 판정했다. 게임 이동 로직을 3.48로 바꾸지 않았다.

## 감도 기능

- 일반 감도 0.1~3.0, 기본 1.0
- ADS 배율 0.3~1.5, 기본 0.8
- 실제 시점 회전: 일반 감도 × (ADS 중 ADS 배율)
- localStorage 저장·새로고침 유지·NaN/Infinity/음수/범위 밖 안전 복구
- 로비 설정 탭과 전투 중 ESC 설정 접근 제공
- 설정 조작은 서버 발사 방향, 피해, 충돌, 물리 상태에 관여하지 않음

## 네트워크·보정·반동 검증

- 지연/누락 스냅샷을 순수 보정 테스트로 재현: 작은 오차는 지수 보간, 큰 강제 위치 불일치는 서버 위치로 snap
- 실제 Socket.IO 경기·리스폰·재대전 회귀는 통과
- 서버 권한 이동·피해·충돌은 기존 92개 단위/통합 테스트로 통과
- 무기 4종 각 20발, 자세별 서버 반동 인덱스·방향·650ms reset·재장전 회귀 통과
- 클라이언트 화면 반동은 서버 recoil index/stance와 동일한 방향을 사용하며, 새 감도는 시점 회전에만 적용

실제 전송 계층에 지연/패킷 손실을 주입하는 프록시 테스트는 이번 패치에 추가하지 않았다. 현재 네트워크 검증은 Socket.IO 실연결과 지연 스냅샷 보정 모델을 분리해 검증한 상태다.

## 테스트 결과

- `npm run check`: 통과 — 92/92 테스트, Vite build 성공
- `npm run test:e2e`: 통과 — 13/13
- 감도 전용 E2E: 2/2
- 실제 친구 대전 반복: 20/20
- 솔로 AI rookie/regular, Z, C/CTRL, reconnect: 통과
- 강제 위치 불일치 보정 단위 테스트: 통과
- PR #9 기준 CI run `41273035071`: 기존 성공 상태 확인
- 지정 CI run `41274649995`: 기존 browser-smoke 실패 원인 분석 완료; 새 브랜치 결과는 별도 Actions에서 확인 필요

## 변경 파일

- `src/App.jsx`: 감도 상태, 설정 접근, 네트워크 phase 계측
- `src/features/settings/sensitivity.js`: 감도 범위·저장·복구
- `src/features/settings/components/SettingsPanel.jsx`: 로비/전투 설정 UI
- `src/features/settings/index.js`: 설정 모듈 공개
- `src/features/lobby/components/MainMenu.jsx`: 설정 탭
- `src/features/combat/components/GameScene.jsx`: 감도 적용, 즉시 Z 입력, 입력 준비 상태, 보정 telemetry
- `shared/reconciliation.js`: 서버 권한 예측 보정 공통 로직
- `e2e/acceptance.spec.js`: 입력 준비 대기 및 자세 검증
- `e2e/lobby.spec.js`: 입장·입력 안정화 계측
- `e2e/sensitivity.spec.js`: 저장·복구·일반/ADS 실제 마우스 이동 검증
- `tests/sensitivity.test.js`, `tests/reconciliation.test.js`: 범위 복구·보정 검증
- `docs/FRONTLINE-V0.3.1-P1.1-REPORT.md`: 본 보고서

## 판정

**PASS — P2 개발 시작 가능.**

단, 실제 WAN 수준의 transport 지연/패킷 손실 프록시 검증은 다음 네트워크 QA 보강 항목으로 남긴다. P2 상점·신규 무기·맵 리워크는 구현하지 않았다.
