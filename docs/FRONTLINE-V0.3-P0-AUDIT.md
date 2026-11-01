# FRONTLINE V0.3.0 P0 baseline audit

Date: 2026-11-01 (Asia/Seoul).

## Verified repository baseline
- Repository: `bduidohd937-beep/fps-proto`.
- GitHub working baseline `feat/online-fps-mvp-v0.1`: commit `01a43f183f584e465b81c71d709c10ed65b21323`.
- `package.json` and server `/api/health` in this baseline identify **V0.2.3**, protocol **4**.
- Earlier verified GitHub Actions run **41232089442**: Node tests 31/31, Chromium Playwright 2/2 and production build passed.
- Existing `render.yaml` targets branch `feat/online-fps-mvp-v0.1` and has `autoDeployTrigger: off`; P0 does not modify this file.
- User's uploaded browser screenshot shows `localhost:5173` UI marked **V0.1.3**. This is **evidence of older frontend content being displayed**, but NOT enough to determine whether it is a stale local branch, Vite process, browser cache, or different folder. Local machine not connected for direct inspection.

## Changes prepared in P0
1. Dedicated feature folders for arena, combat, lobby controls, match clock.
2. Server player factory/snapshot moved to separate pure module.
3. Shared version/protocol and render-quality configurations.
4. Asset category tree and catalog with optional-asset fallback.
5. Conditional countdown clock; avoids unconditional 10Hz lobby UI updates.
6. Import/asset architecture CI guard and local-only version doctor.
7. No P1 new lobby, no P2 bots, no skill/operator perks, no new cosmetics.

## Validation required after P0
- Automated Node tests + Vite build + two-browser Playwright on new branch.
- Local `npm run doctor` once the user checks out the P0 branch and starts dev server.
- User laptop FPS/latency measurements, and Render live gameplay only after separate approval.

## Local repair steps if V0.1.3 still appears
```powershell
# From a terminal opened in the actual fps-proto folder
git status
git fetch origin
git switch chore/frontline-v0.3.0-p0-foundation
git pull --ff-only origin chore/frontline-v0.3.0-p0-foundation
npm install
npm run dev
# Run in a separate terminal:
npm run doctor
```
Stop previous `npm run dev` processes before starting. Vite `strictPort: true` refuses a stale app already holding port 5173; do NOT force-delete uncommitted local changes. Once correct, `/api/health` serves protocol 4 and version 0.2.3.
