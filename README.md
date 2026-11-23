# FULLSCALE — Prototype

Mobile-first browser prototype for the **FULLSCALE** simultaneous-action board/card strategy game.

## Project status

**Bootstrap stage — game not implemented or deployed yet.**

The current authoritative test specification is in [`docs/TEST_RULES.md`](docs/TEST_RULES.md), version **P1.0**. It defines the 6×8 three-lane board, placeholder Land/Sea/Air cards, two-player hot-seat programming, combat, turn timing, and prototype victory conditions.

[Original living Test Rules Google Doc](https://docs.google.com/document/d/1jlDsXEQgh-dZcRKGmgITzTa0Ci4IPraLJoRrTjlrDvU/edit) (the checked-in document is a snapshot; changes do not sync automatically).

Codex should read [`AGENTS.md`](AGENTS.md) and the entire test rules before writing code.

## Planned stack

- TypeScript + Vite
- Plain HTML/CSS, unless a lightweight UI framework is demonstrably simpler
- Deterministic standalone rules engine and automated tests
- GitHub Pages hosting from `/fullscale-prototype/`
- iPhone Safari / Add to Home Screen
- Initially **hot-seat**, not online two-device multiplayer

## Next development step

Open this repository in **Codex cloud** or a local Codex-compatible workspace. Ask Codex to build the complete playable P1.0 prototype against the checked-in rules, with tests and GitHub Pages deployment configuration.

Do not claim that a deployed app exists until the Pages workflow has succeeded and the website has been tested.

## User-facing privacy

The first playable version will run entirely in one browser. Each player will privately order cards using a handoff screen. GitHub Pages only hosts static game files and does not provide a server for online multiplayer.

## License

No license selected yet.
