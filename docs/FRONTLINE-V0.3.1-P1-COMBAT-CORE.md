# FRONTLINE REFORGED V0.3.1 — P1 combat core (draft)

**Status:** Implemented in independent branch only; manual laptop gameplay and Render not verified. Not a completed V0.3.1 release.

## Working branch
`feat/frontline-v0.3.1-combat-core-p1` based on completed V0.3.0 preview commit `7618c02c8d7332c349293fadca5052c37300e6b1`. Keep P0 and V0.3.0 PRs, `main` and public Render service unchanged.

## Actual gameplay in P1
- Z: toggle prone on/off. 0.56 m collision height; eye 0.42 m; speed 1.3 m/s. Space cannot jump while prone.
- Ctrl/C crouch 1.12 m and 2.7 m/s; walk 5.2 m/s; Shift sprint 7.2 m/s unchanged. Ceiling checks automatically keep player prone/crouched if standing would intersect a mesh.
- New low obstacle `prone-beam` at x=8 z=-5, y=.82: upright and crouched collide while prone fits. Shared server/client world boxes and 3D mover remain the source of truth.
- 4 existing weapons now have original, repeatable horizontal/vertical burst recoil sequences, reset after 650ms without a shot.
- Shot server determines `stance`, `recoilIndex`, spread and hit validation. Stances: still, walking, sprinting, crouched, prone, airborne. Each stance has different spread and visual kick.
- Real prone hit region + firing eye height; bot line-of-sight/aim uses the target's prone height instead of standing head position.
- Bot ground navigation now queries the same collision volume as player movement and checks sampled edges before joining nodes (avoids nav paths cutting through colliders).
- Optional F3 HUD displays stance and altitude. Permanently centered instruction text removed.
- The optional artist-facing prone silhouette uses primitive geometry only. Proper rig/animation is still pending.

## Limitations / later phases (NOT implemented here)
- P2 five-second server-authoritative preparation and economy/store; P3 pistol/shotgun, six-gun balance, TTK/range; P4 medkit/tracers/muzzle flash; P5 IRON DEPOT rework, higher-quality assets.
- Current bot ground-grid navigation is not a multilayer 3D navmesh. Upper-floor route generation and vaulting are explicitly deferred.
- No sound or new model files were added. All gameplay balancing numbers are **provisional** pending playtesting.
- Camera-recoil feedback is driven by acknowledged server shot events and not client-predicted.
- AI shooting and collision server authority unchanged; client merely predicts camera/movement.

## Test criteria
```bash
npm run check
npm run test:e2e
```
Look for prone collision and ceiling tests, recoil sequence and stance tests, nav safety, Socket.IO prone sync and real Chromium Z toggle + F3. CI pass does not verify laptop FPS or subjective recoil feel.

## Local preview
Stop old Vite/Node processes. From the fps-proto folder, with no uncommitted local changes:
```powershell
git fetch origin
git switch feat/frontline-v0.3.1-combat-core-p1
git pull --ff-only origin feat/frontline-v0.3.1-combat-core-p1
npm install
npm run dev
```
Browser: http://localhost:5173 / Health: http://localhost:43171/api/health (version 0.3.1, protocol 6).
