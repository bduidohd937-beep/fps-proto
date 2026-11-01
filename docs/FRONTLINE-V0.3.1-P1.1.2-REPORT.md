# PROJECT DUEL V0.3.1 P1.1.2 Hotfix Report

## Status

Local verification: PASS. Final acceptance remains pending until the new Push and Pull Request GitHub Actions runs complete successfully.

## Root cause

The failures in Actions runs `41278874999` and `41278883545` were isolated to the sensitivity E2E test. The game only consumes mouse movement while the game canvas owns Pointer Lock. The test used Playwright's locator click, which can be a synthetic DOM activation in headless Chromium and did not reliably grant Pointer Lock in the CI environment. Consequently, `mousemove` was ignored and `data-acceptance-yaw` remained `-1.5708`.

The game input path itself was not bypassed or disabled. The test now performs a real coordinate mouse click on the canvas and asserts Pointer Lock before measuring yaw. Acceptance telemetry also records pointer-lock state, mouse-event count, and the last movement deltas.

During the required ESC regression check, a second real defect was found: the global game Escape handler called `preventDefault()`, interfering with browser Pointer Lock release. The handler now explicitly exits Pointer Lock before opening or closing the settings overlay.

## Changes

- `src/App.jsx`: explicitly release Pointer Lock when Escape opens/closes in-game settings; no server or combat authority changes.
- `src/features/combat/components/GameScene.jsx`: add acceptance-only Pointer Lock and mouse-event telemetry, including `pointerlockerror` visibility; input and sensitivity calculations are unchanged.
- `e2e/sensitivity.spec.js`: use trusted coordinate mouse clicks, assert Pointer Lock and mouse delivery, and add acquire → ESC release → settings → reacquire coverage.

## Verification

Environment: Windows, Chromium, local Playwright web server, one worker.

- `npm run check`: PASS — architecture check, 92/92 unit/integration tests, production build.
- `npm run test:e2e`: PASS — 14/14, including friend lobby, solo AI, posture/reconnect, sensitivity, and regression flows.
- `npx playwright test e2e/sensitivity.spec.js --repeat-each=10`: PASS — 30/30 (10 repetitions of each of 3 sensitivity scenarios).
- ESC Pointer Lock targeted repeat: PASS — 5/5.

The sensitivity tests cover localStorage persistence, invalid-value recovery, general and ADS yaw differences, Pointer Lock acquisition, ESC release, settings access, and reacquisition. Existing server-authoritative firing, movement, collision, and damage code was not changed.

## GitHub follow-up

Branch: `fix/frontline-v0.3.1-p1-1-2-sensitivity-ci`

Base: `feat/frontline-v0.3.1-p1-1-network-sensitivity` at `18143b5577e17d42ea599604df53482ef9ddfbda`

Existing PR #11, `main`, and Render deployment are not modified. The Draft PR and its Push/PR Actions links will be recorded after the branch is pushed.

## Remaining risks

The CI result for the new commit must still be observed. Browser Pointer Lock behavior can vary by runner configuration, so the explicit lock assertion is intentionally retained. No separate physical mouse or non-Chromium measurement was performed.

## P2 readiness

YES, conditional on both new GitHub Actions workflows passing.

