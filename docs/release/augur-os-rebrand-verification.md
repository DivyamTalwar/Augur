# Augur OS Rebrand Verification

## Release Goal

Rebrand the application, repository, desktop runtime, documentation, and visual assets to Augur OS.

Tagline:

> Augur reads the signals. You close the deal.

## PR Ladder

| Round | Feature PR | Promotion PR | Scope |
| --- | --- | --- | --- |
| 1 | #1 | #2 | Project ignore policy |
| 2 | #3 | #4 | Frontend application foundation |
| 3 | #5 | #6 | Tauri desktop runtime |
| 4 | #7 | #8 | Visual assets |
| 5 | #9 | #10 | Product and developer documentation |
| 6 | #11 | #12 | Prompt reference mock |
| 7 | #13 | #14 | Scoring reference mock |
| 8 | #15 | #16 | Release verification record |

## Verification Commands

Run from the repository root unless noted otherwise.

```bash
bun run build
bun run lint
(cd src-tauri && cargo check)
rg -n -i "$LEGACY_IDENTITY_PATTERN" --hidden -g '!node_modules/**' -g '!src-tauri/target/**' -g '!.git/**'
find . -path './node_modules' -prune -o -path './src-tauri/target' -prune -o -path './.git' -prune -o "$LEGACY_NAME_PREDICATE" -print
```

## Verification Result

- Frontend production build passes.
- ESLint passes.
- Rust desktop runtime check passes.
- Full Tauri production packaging passed during the desktop runtime round.
- Text search for the previous product identity returns no matches.
- File path search for previous product identity names returns no matches.
- Generated artifacts remain ignored by `.gitignore`.

## Release Notes

- Application name: Augur OS.
- Desktop identifier: `com.divyamtalwar.augur`.
- Rust package and binary: `augur-os`.
- Local data directory: `~/.local/share/augur-os/data.db`.
- Public repository target: `https://github.com/DivyamTalwar/Augur`.
