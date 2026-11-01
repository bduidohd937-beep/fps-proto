# PROJECT DUEL — FRONTLINE REFORGED V0.3.0 / P0 Architecture (Draft)

**Status:** P0 structural prep on independent branch; V0.3.0 gameplay still NOT implemented.
**Protected baseline:** V0.2.3 on `feat/online-fps-mvp-v0.1`, commit `01a43f183f584e465b81c71d709c10ed65b21323`.
**P0 working branch:** `chore/frontline-v0.3.0-p0-foundation`.

## Scope

Preserve server-authoritative 1v1 multiplayer, all four guns, ADS, jump/crouch and IRON DEPOT. Extract ownership boundaries, create safe asset slots, unify protocol/quality and remove unnecessary 100ms lobby re-renders. **Do not implement P1 new lobby/P2 AI yet, and do not change Render deployment.**

## Proposed source tree

```text
src/
  App.jsx                       # application composition + Socket.IO lifecycle; P1 refactor target
  config/renderQuality.js       # frozen shared graphics presets
  assets/catalog.js             # canonical asset IDs + null-safe fallbacks
  features/
    arena/
      index.js                  # public API
      components/FrontlineArena.jsx
    combat/
      index.js                  # public API
      components/GameScene.jsx
      utils/renderSmoothing.js
    lobby/
      index.js
      components/GraphicsQualitySelect.jsx
    match/
      index.js
      hooks/useBattleClock.js
    modes/README.md             # P1/P2 placeholder
    operators/README.md         # V0.3.1 placeholder
server/
  index.js                      # Socket.IO transport + authoritative tick (still monolithic, next refactor)
  domain/players.js             # pure player factory + public snapshot
  bots/README.md                # P2 bot logic reserved, no bot yet
shared/
  rules.js, frontline.js        # world/physics collision (authoritative)
  combat.js, weapons.js         # hit zones, damage, weapon definitions
  version.js                    # single service/protocol/release contract
public/assets/
  maps/ operators/ weapons/ audio/ ui/  # placeholder directories, NO external assets yet
scripts/
  check-architecture.mjs        # import boundary + asset checks
  doctor.mjs                    # user machine dev-server diagnostic
tests/
  foundation.test.js
```

## Dependency policy

1. `shared`: framework-free data and pure rules. Never import browser UI or Node server implementation.
2. `server`: imports `shared` and its own server/domain, never `src`. It alone authorizes positions, ammo, damage and match scores.
3. `src`: imports `shared`, `config` and feature public entrypoints. It may predict movement and display effects but must not grant gameplay authority.
4. Cross-feature imports must go through `src/features/<feature>/index.js`. Avoid private deep imports across features.
5. `src/App.jsx` is a temporary composition root. P1 will extract lobby, match and navigation UI without creating circular imports.
6. Future `server/bots` logic must use existing authoritative character/weapon rules, not a special invulnerable bot implementation.
7. Do not use implicit global mutable singletons for per-match state. Keep rooms/matches independent.

## Asset / performance policy

- Asset categories: `operators`, `weapons`, `maps`, `audio`, `ui`.
- Catalog IDs may refer to actual shipped files only; `file:null` resolves to `null` so procedural soldiers, rifles and arena continue to render if an asset is missing.
- All assets: lowercase hyphenated names, explicit license/attribution, no unlicensed third-party game models.
- Proposed trial budgets only: operator ≤3 MB, weapon ≤2 MB, compressed texture resolution ≤1024 px unless demonstrated need, short SFX ≤200 KB, hard CI single-asset cap 12 MB.
- Keep `FrontlineArena` memoized; quality profiles are frozen, so no new DPR or shadow-size arrays on every parent render.
- Dynamic countdown clock now runs only during reload/respawn, not perpetually on the lobby. Verify FPS on target hardware before claiming gains.
- Later stages: lazy-load operator previews, batch repeated props via instancing, reduce audio source count, pool muzzle flashes/tracers/casings, track heap/GPU pressure.

## P0 ownership / conflict prevention

- P1 main lobby: `src/features/lobby` and `src/features/modes`.
- P2 bots and server matchmaking: `server/bots` and `server/match` (create `server/match` when needed).
- V0.3.1 operators: `src/features/operators`, `shared/operators.js` plus server validation.
- V0.3.2 audio/prone: `public/assets/audio`, future audio feature, `shared/frontline.js`.
- V0.3.3 shooting effects: `src/features/combat` and `shared/weapons.js`; server ownership of hit detection is unchanged.
- V0.3.4 skins: `src/assets/catalog.js`, `public/assets/operators|weapons`, future cosmetic data.
- Mainline branch unchanged; all features use topic branches and PRs with CI. Avoid touching `main` and Render without separate approval.

## Validation gates

```bash
npm run check
npm run test:e2e
npm run doctor
```

`npm run check` includes import boundaries, 31 existing V0.2.3 tests plus P0 tests and build.
Playwright browser smoke checks actual room/join, jump/crouch, weapon switches. `npm run doctor` is local-only and diagnoses old V0.1.3 still served on `localhost:5173`.
A GitHub CI pass proves builds and browser automation in CI, NOT target-PC FPS or real internet gameplay.
