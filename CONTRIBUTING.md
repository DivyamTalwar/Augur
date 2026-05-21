# Contributing to Augur OS

Thanks for your interest in contributing. Augur OS is a Tauri 2 desktop application for B2B lead research and signal scoring. This guide explains how to set up the project, propose changes, and get them merged.

## Code of conduct

Be respectful and constructive. Harassment or abusive behavior is not tolerated in issues, pull requests, or any other project space.

## Ways to contribute

- **Report a bug** with the Bug report issue template.
- **Request a feature** with the Feature request issue template.
- **Submit a fix or feature** by opening a pull request (see below).
- **Improve the docs** — documentation fixes are very welcome.

For anything large, please open an issue to discuss the approach before writing code.

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Rust + Tauri 2 + SQLite
- **Tooling:** Bun

## Local setup

Prerequisites:

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Bun](https://bun.sh)
- Platform dependencies for Tauri 2 — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

Then:

```bash
bun install            # install frontend dependencies
bun run tauri:dev      # run the app with hot reload
```

Other useful commands:

```bash
bun run dev            # frontend only (Vite dev server)
bun run tauri:build    # production build
bun run lint           # lint
bun run lint:fix       # lint and autofix
bun run format         # format with Prettier
tsc -b                 # type-check
```

## Branching and commits

- Branch from `main` with a descriptive prefix: `feat/...`, `fix/...`, `docs/...`, or `chore/...`.
- Write [Conventional Commit](https://www.conventionalcommits.org/) messages, for example `fix(scoring): handle an empty rubric`.
- Keep each pull request focused on a single logical change.

## Pull requests

1. Fork the repository and create your branch.
2. Make your change. Run `bun run lint` and `tsc -b` and confirm they pass.
3. Open a pull request against the `main` branch and fill in the template.
4. A maintainer reviews it. Every pull request requires maintainer approval before it can be merged.
5. Address review feedback by pushing more commits to the same branch.

Please never commit secrets, API keys, `.env` files, or real customer data. The repository history is public.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE), the same license as the project.
