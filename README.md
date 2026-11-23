# FULLSCALE — Prototype

The deterministic P1.0 rules engine is implemented. The playable hot-seat interface and deployment are pending.

The authoritative specification is [P1.0 Test Rules](docs/TEST_RULES.md). The [implementation decisions](docs/IMPLEMENTATION_DECISIONS.md) document how conflicting or underspecified edge cases resolve.

## Development

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run dev
```

The Vite shell uses the `/fullscale-prototype/` base path. The browser currently shows a project status page.

## Engine entry points

- `createGame(seed)` creates the initial state with the seeded draws.
- `commitOrders(state, owner, orders)` commits a full hand in top-to-bottom order, with lane choices represented as `1`, `2`, or `3`.
- `advance(state)` advances one reveal beat, lane wave, or cleanup and returns a new state. It requires both commitments before the first reveal.
- `gameView(state, viewer)` returns a player-facing projection. Omit the viewer on shared handoff screens. Keep the full simulation state and replay inputs private.

## License

No license selected yet.
