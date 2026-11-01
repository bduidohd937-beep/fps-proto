# PROJECT DUEL V0.3.1 P1.1.2 Hotfix Report

## Status

Local verification: PASS. Final acceptance remains pending until the new Push and Pull Request GitHub Actions runs complete successfully.

The first hotfix commit was not accepted by CI: Push run `41281217795` passed `test-and-build` but failed `browser-smoke`, and its PR merge ref failed the same sensitivity case. The failure occurred after the right-button ADS transition: the test waited for yaw to change without proving that the lock and mouse event stream were still active.

## Root cause

The failures in Actions runs `41278874999` and `41278883545` were isolated to the sensitivity E2E test. The game only consumes mouse movement while the game canvas owns Pointer Lock. The test used Playwright's locator click, which can be a synthetic DOM activation in headless Chromium and did not reliably grant Pointer Lock in the CI environment. Consequently, `mousemove` was ignored and `data-acceptance-yaw` remained `-1.5708`.

The game input path itself was not bypassed or disabled. The test now performs a real coordinate mouse click on the canvas and asserts Pointer Lock before measuring yaw. The original comparison also incorrectly compared raw yaw deltas from two potentially different browser `movementX` values and reused absolute coordinates after a lock transition. The corrected test records cumulative `movementX`, releases and reacquires Pointer Lock between samples, verifies the ADS state, and compares yaw-per-input-unit. Failure diagnostics preserve lock state, aim state, event count, and cumulative movement.

The next CI run also exposed that the visible yaw stream can include legitimate server shot recoil while the bot is active. The test now compares the mouse-applied yaw contribution separately, while still requiring visible yaw movement and preserving both values in diagnostics. This prevents recoil from being misreported as a sensitivity failure.

During the required ESC regression check, a second real defect was found: the global game Escape handler called `preventDefault()`, interfering with browser Pointer Lock release. The handler now explicitly exits Pointer Lock before opening or closing the settings overlay.

## Changes

- `src/App.jsx`: explicitly release Pointer Lock when Escape opens/closes in-game settings; no server or combat authority changes.
- `src/features/combat/components/GameScene.jsx`: add acceptance-only Pointer Lock, aim-state, and cumulative mouse-event telemetry, including `pointerlockerror` visibility; input and sensitivity calculations are unchanged.
- `e2e/sensitivity.spec.js`: use trusted coordinate mouse clicks, compare normalized yaw per actual `movementX`, explicitly reacquire Pointer Lock between general/ADS samples, preserve failure diagnostics, and retain ESC settings coverage.

## Verification

Environment: Windows, Chromium, local Playwright web server, one worker.

- `npm run check`: PASS — architecture check, 92/92 unit/integration tests, production build.
- `npm run test:e2e`: PASS — 14/14, including friend lobby, solo AI, posture/reconnect, sensitivity, and regression flows.
- `npx playwright test e2e/sensitivity.spec.js --repeat-each=10`: PASS — 30/30 (10 repetitions of each of 3 sensitivity scenarios).
- General/ADS normalized comparison repeated 10 times: PASS — 10/10.
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

