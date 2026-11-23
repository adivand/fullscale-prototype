# FULLSCALE — Codex development instructions

## Source of truth
- Read the ENTIRE `docs/TEST_RULES.md` before implementing any game rules. It is the authoritative, unofficial P1.0 prototype specification for this repository.
- The separate Google Doc "FULLSCALE GAME — Rules & Mechanics" is NOT the implementation specification; do not merge earlier open/conflicting rules into P1.0.
- Temporary cards are placeholders. Keep their data in a simple standalone card registry so real card definitions can replace them later.
- Preserve standardized terms: **Border** = between-lane divider; **Barrier** = snake segment; **Wall** = West/East lane terminal; **Boundary** = outer North/South board edge.

## Goal and deployment
- Build a complete playable, deterministic, mobile-first **two-player hot-seat** browser game. Both players privately program orders on the SAME device; networked multiplayer is OUT OF SCOPE.
- Prefer TypeScript, Vite and plain CSS/HTML, adding a UI framework only if it materially simplifies the application.
- Deploy as a static GitHub Pages application from repository `adivand/fullscale-prototype`. Respect the project base path `/fullscale-prototype/`.
- Set a manifest, Home Screen icon and Apple-friendly metadata. Make no unverified claims about a physical iPhone test.
- Do not implement offline caching/service workers initially; avoid stale deployed assets.

## Rules engine
- Separate pure deterministic state transitions, geometry, card registry, simulation and event logs from the view layer.
- Implement BOTH player intents for a reveal beat or rank pair against the same board snapshot; do not accidentally favor whichever side is iterated first.
- Implement Signals, END secrecy, paired lane waves, exactly-once auto movement per turn, paid successful plays, failed free plays, Turn Wait recovery, Land/Sea/Air movement, Clash, Surprise, friendly Push, Wall breaches and victory conditions.
- A move with multiple geometric steps has **final-destination contact only**, except direct swaps, exactly as P1.0 specifies. Render animations separately from rules.
- One Asset per cell after each resolution event. Store permanent unique card IDs, seed-based draw randomness, ordered events and reproducible state.
- Keep concealed hands and unrevealed orders hidden on shared-device handoff screens.
- Never silently add special combat modifiers, additional card abilities or online multiplayer.

## Mobile interaction
- Target iPhone 14 Safari portrait first, then support desktop and tablet layouts.
- Use tap-to-select, move up/down controls and clear phase progression; no mandatory drag-and-drop, hover or keyboard.
- Account for safe area insets, touch targets, scrollable panels and viewport resizing; prevent horizontal overflow.
- Include basic accessibility labels, visible disabled controls, and a resolution/event log.
- Make games restartable; prefer simple local persistence with validated schema.

## Testing and quality gates
- Translate ALL `P1-TEST-01` through `P1-TEST-15` into executable automated tests where applicable.
- Add tests for cross-player simultaneity, invalid destinations, push-chain blocking, turn-wait boundary timing and scoring ties.
- Run tests, typecheck and production build; repair failures before stating completion.
- Use automated Chromium/WebKit mobile-sized checks if available; otherwise state honestly what could not be verified.
- Never assert deployment success unless an actual public URL has been verified; distinguish code configured for deployment from deployed site.
- Avoid editing unrelated repositories, accounts or the original Rules & Mechanics Google Doc.

## Development workflow
1. Inspect repository and read this file and `docs/TEST_RULES.md`.
2. Implement core data model and pure engine, then unit tests.
3. Build mobile-first UI and handoff privacy flow.
4. Run automated tests, typecheck and build. Fix defects.
5. Configure GitHub Pages workflow, manifest and base paths; document any one-time GitHub settings needed.
6. Provide verified results, repository link, deployment status and precise next actions.

If any P1.0 edge case truly cannot be implemented without choosing a new rule, record the chosen `PROTOTYPE-ONLY` default in `docs/IMPLEMENTATION_DECISIONS.md` and add a test. Prefer a deterministic, simple interpretation; do not change the gameplay intentionally without documenting it.
