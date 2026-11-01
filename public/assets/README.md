# PROJECT DUEL assets — P0 boundary

Put real binary assets into category folders: `operators/`, `weapons/`, `maps/`, `audio/`, `ui/`.
Keep all binary licensing, author/source, attribution and modification rights documented in the corresponding asset manifest. Do not commit copyrighted commercial game assets without permission.

- Use lower-case kebab-case names and versioned files when a change breaks references.
- Reference real files only via `src/assets/catalog.js`. No string-concatenated URLs scattered through features.
- Handle missing optional assets with procedural models/CSS/silence; never break multiplayer gameplay.
- Avoid dynamic imports of large 3D models in the first-paint lobby. Later lazy-load selected operators/skins.
- Initial **provisional** art budgets: operator meshes ≤3 MB each, weapon meshes ≤2 MB, compressed texture ≤1024px where suitable; short audio SFX ≤200 KB each. These are guidelines to test, not current measured assets.
- Audio: use user gesture unlock and cap simultaneous SFX. VFX: pool reusable particles, cull distant trails.
- Commit files only after verifying license, quality, file sizes and paths; store large deliverables externally with explicit access controls where appropriate.
