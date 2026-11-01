# V0.3.1 P1 stabilization evidence

Base: PR #8, `feat/frontline-v0.3.1-combat-core-p1`, `21fd703699f7a03135a543f732a5f0741d2da961`.
Work branch: `feat/frontline-v0.3.1-p1-stabilization`. No main merge or Render deployment.

## Reproduction and causes

- Actions run 41271185478: build/check passed; browser-smoke failed at lobby.spec.js:19, waiting 15s for the second client's `.menu-server.online` (5 other browser tests passed). Log inspected through GitHub connector.
- Local reproduction with Chromium/SwiftShader: same assertion failed. Failure trace shows host health HTTP 200 in 4.841ms, peer health aborted after 4960.047ms with `net::ERR_ABORTED`. Peer screenshot/accessibility output shows CONNECTING plus health-check failure. Socket connect had already fired, because that is what initiates this fetch. Thus this reproduction is a post-connect health-gate failure, not evidence of a failed websocket handshake.
- The existing 5s abort permanently leaves that connection offline; there is no subsequent check unless a socket reconnect occurs. Continuous host waiting-scene rendering and peer operator rendering compete with startup under software WebGL. Defer operator WebGL until validation and render waiting/finished scenes on demand. Keep 5s health and 15s assertion limits and zero retries. Historical CI's precise GPU scheduling cannot be proven from its text log alone; the matching local trace establishes the local mechanism.
- Health checks from obsolete connections could still update UI. Abort on disconnect/unmount/replacement and reject aborted/stale results.
- Browser tests issued keys when the HTML scoreboard existed, before the asynchronous Canvas controller installed handlers. Expose controller readiness on the canvas and await it before keyboard actions. This fixes a test synchronization error rather than retrying dropped inputs.
- Camera applied horizontal kick with subtraction, opposite the server's additive yaw offset. Use addition; retain existing camera vertical kick magnitude.
- Server multiplied random spread by stance but omitted stance scaling for deterministic recoil. Apply the existing stance recoil multiplier to deterministic offsets too. Shot events now expose the already-authoritative offsets/spread for reproducible inspection; no client-provided damage or direction claims are trusted.
- Holding Shift without movement incorrectly used sprint accuracy. Require actual movement intent; update the old sprint fixture to include forward input.
- AI nearest-node attachment previously chose nodes by distance without validating the connector edge. Validate that edge with the same collision sampler; only test candidates closer than the current best.

## Files and purposes

- `src/App.jsx`: health lifecycle cancellation and stale-result protection.
- `MainMenu.jsx`, `GameScene.jsx`: startup/render workload sequencing, camera yaw correction, controller readiness.
- `shared/recoil.js`, `server/domain/combat.js`: stance consistency and authoritative shot measurements.
- `server/bots/navigation.js`: safe graph attachment.
- `playwright.config.js`, `vite.config.js`: owned test ports 5273/43271, health-based readiness, no reuse of an unrelated running development server.
- `package-lock.json`, CI workflow: lock installed dependencies and use npm ci in CI.
- tests: input readiness, explicit health failure/version rejection, both AI difficulties, reconnect via reload, 24 weapon/posture combinations with 20 shots each, reload/reset checks, collision samples and AI simulation.
- `.gitignore`: exclude generated browser evidence.

## Reproduce

```
npm ci --no-audit --no-fund
npx playwright install chromium
npm run check
npm run test:e2e
npx playwright test --repeat-each=2
npx playwright test e2e/lobby.spec.js --repeat-each=5
```

Tests use independent browser contexts within one Chromium process, not two independent installed browsers. No assertion timeouts or retries were increased. All browser failures retain screenshots and traces.

Environment: Windows, Node v24.21.0, npm 11.19.0, Playwright Chromium 156.0.8078.4 with SwiftShader, one worker. CI uses Ubuntu and Node 22; its result must be checked independently.

## Scope and remaining risks

- Twenty domain-level accepted shots per weapon/posture (480 total) use a controlled RNG to separate deterministic recoil from spread. Output records angular envelopes and bloom-adjusted spread, not rendered wall decals or pixel groups. MKR-12's 1050ms cadence exceeds the existing 650ms reset: each accepted sniper shot starts a new burst. This policy is intentionally preserved.
- Camera and server recoil are complementary layers, not equal angles: camera keeps its original larger vertical visual kick, while server adds small shot offsets to supplied aim. Complete render-to-server aiming latency and pixel-level trajectory consistency remain unmeasured.
- Collision tests sample actual shared movement at 30Hz through ducts, stairs and corners. Browser tests exercise crouch/prone/jump and movement keys, and existing socket tests check replicated height/posture. Exact browser camera height/speed and forced prediction-desync recovery at every map obstacle still need dedicated end-to-end measurement.
- Both bot difficulties run 60 simulated seconds with standing-volume collision assertions and actual authoritative shots. Graph remains ground-only; elevated tactical navigation, exhaustive stuck recovery and all oscillation scenarios are not certified.
- Weapon switching is covered in real browser and socket regressions. Full live-socket kill-to-respawn and match-finish/restart chains are not newly certified by this patch.
- No FPS, p95 frame time, server tick speedup, memory reduction or comparative production performance claim is made. Build retains the existing >500kB chunk warning.
- P2 preparation/shop features are unchanged. Merge acceptance should require outstanding end-to-end combat/physics checks; P2 should use server match state for input/fire gating and authoritative inventory rather than bypassing it.
- Session token usage is unavailable from the tools used.

## Verification results

- Final `npm run check`: 86/86 tests passed, architecture passed, production build passed (existing chunk warning retained).
- Final `npx playwright test --repeat-each=2`: 20/20 passed in 1.6 minutes, zero retries. Includes two successful friend-join cycles and both difficulties twice.
- Earlier investigative browser runs: baseline friend health timeout reproduced; intermediate run had 2 failures/8 passes (input handler readiness and concurrent development reload during investigation). These were not counted as successful validation.
- Dedicated five-repeat friend/low-graphics suite: 10/10 passed in 1.2 minutes (five successful friend joins, five low-graphics creates).
- Hosted CI for implementation commit `0a73d24`: run 41272917944, test-and-build passed; browser-smoke was running when this report was updated. Consult the PR checks for the final hosted result.
- Do not treat this draft as a full P1 stability certification; the scope limitations above remain open.
