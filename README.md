# FULLSCALE — Prototype

FULLSCALE P1.0 is a two-player hot-seat strategy game. West and East take turns programming private orders on the same device, then watch the simultaneous reveals and lane waves together.

The authoritative specification is [P1.0 Test Rules](docs/TEST_RULES.md). The [implementation decisions](docs/IMPLEMENTATION_DECISIONS.md) document how conflicting or underspecified edge cases resolve.

## Run locally

Use Node.js 24 for the same version as CI.

```sh
npm ci
npm run dev
```

Open the `/fullscale-prototype/` URL shown by Vite. Select cards by tapping, assign lanes, and reorder the stack with Up, Down, or Before END. END starts at the top so revealing anything takes an explicit order change. The reserve shortcut sets L1 only for unassigned cards below END.

The browser saves committed orders and completed steps locally. Reloading during programming returns to the private handoff and clears the uncommitted draft. Hidden cards are kept out of shared screens. Device users with developer tools can access the local save. **Reset** restarts the same shuffle. **New Game** starts a fresh shuffle. Both ask for confirmation before replacing progress.

## Verify

```sh
npm test
npm run typecheck
npm run build
npx playwright install --with-deps chromium webkit
npm run test:browser
```

Browser tests serve the production build and use iPhone 14 viewport profiles for Chromium and WebKit. To use a system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` and select `--project=chromium-iphone14`.

## Engine entry points

- `createGame(seed)` creates the initial state with seeded draws.
- `commitOrders(state, owner, orders)` commits a full hand in top-to-bottom order, with lane choices represented as `1`, `2`, or `3`.
- `advance(state)` advances one reveal beat, lane wave, or cleanup and returns a new state.
- `gameView(state, viewer)` returns a player-facing projection. Omit the viewer on shared handoff screens.

## License

No license selected yet.
