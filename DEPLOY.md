# PROJECT DUEL — Render 배포 가이드

이 프로젝트는 React+Vite 정적 파일과 Socket.IO Node 서버를 **한 개의 Render Web Service**에서 제공하도록 설계되었습니다.

## 배포 (무료 프로토타입)

1. [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fbduidohd937-beep%2Ffps-proto%2Ftree%2Ffeat%2Fonline-fps-mvp-v0.1)를 엽니다.
2. Render 로그인 및 필요한 GitHub 연결을 승인합니다.
3. Blueprint 내 **fps-proto-duel** 서비스, **Free** 인스턴스, **Singapore** 리전을 확인합니다. 유료 요금제는 선택하지 마세요.
4. 배포를 승인하고 Render의 Deploy Logs에서 성공 여부를 확인합니다.
5. 제공된 `https://<서비스명>.onrender.com` 링크로 접속해 방을 만들고, 친구에게 '초대 링크 복사'로 전송합니다.

## 설정

- Blueprint: `render.yaml`
- Branch: `feat/online-fps-mvp-v0.1` (미확정 PR 보호)
- Build: `npm install --include=dev --no-audit --no-fund && npm run check`
- Start: `npm start` (Render에서 제공하는 `PORT` 사용)
- Health check: `/api/health` (`{"ok":true}` 포함 응답)
- 게임 클라이언트/서버: 같은 origin. 별도 API URL이나 CORS 설정이 필요하지 않음.
- Render 자동 배포: **OFF** (의도치 않은 변경 배포 방지). 변경 후 Render에서 수동으로 배포.

## 테스트 체크리스트

- [ ] 배포 상태 Live 및 `/api/health` 상태 확인
- [ ] 웹 접속 시 방 생성 가능
- [ ] 다른 PC나 브라우저에서 초대 링크 접속 및 방 입장
- [ ] 양쪽 이동/조준/사격/HP/킬 동기화
- [ ] 5킬 달성 및 재대전
- [ ] 새로고침/퇴장 후 서버 메모리 룸 정리

## 무료 플랜 유의사항

Render 무료 인스턴스는 유휴 상태에서 중단되어 최초 접속 시 재시작 시간이 걸릴 수 있습니다. 재시작/재배포 시 게임 세션은 사라집니다. 무료 사용량 한도를 확인하세요. 요금제가 유료로 표시되면 승인하지 마세요.

Render 로그인 및 배포 승인은 사용자가 직접 수행해야 합니다. GitHub 코드 반영만으로 실제 사이트가 배포되는 것은 아닙니다.
