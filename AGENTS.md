# Agent Instructions

## Project Context

This repository is a TypeScript VS Code extension that packages a VSIX.

- Extension entrypoint: `src/extension.ts`
- Build output: `out/`
- Package manifest: `package.json`
- Lockfile: `package-lock.json`
- Release workflow: `.github/workflows/release.yml`

Do not commit generated or local-only artifacts such as `node_modules/`, `out/`, `.npm-cache/`, `.tmp*.vsix`, or `*.vsix`.

## Dependency Policy

Keep direct npm dependencies up to date.

Before dependency-related work, check current latest versions:

```powershell
npm.cmd outdated --depth=0
npm.cmd view @types/vscode version
npm.cmd view @types/node version
npm.cmd view @vscode/vsce version
npm.cmd view typescript version
```

If any direct dependency is behind latest, try to upgrade it. Update both `package.json` and `package-lock.json`. If npm cache writes fail because the system drive is full, use a workspace-local cache:

```powershell
$env:npm_config_cache="$PWD\.npm-cache"
npm.cmd install
```

When upgrading `@types/vscode`, also update `engines.vscode` to match the minimum VS Code API level used by the code.

## API Modernization Policy

When packages are upgraded, update the code to the newest supported APIs.

- Do not keep using deprecated methods, contribution points, or options after upgrading.
- Do not suppress deprecation or compatibility issues with broad `any`, unsafe casts, or `skipLibCheck`-style workarounds unless there is no current API replacement.
- Check the latest VS Code extension API shape when changing VS Code chat, language model, inline completion, command, or packaging behavior.
- If a dependency upgrade changes method signatures or removes APIs, migrate call sites instead of pinning the old method style.
- Keep `@types/vscode`, `engines.vscode`, and runtime assumptions aligned.

## Verification Policy

After dependency, API, or packaging changes, run:

```powershell
npm.cmd run test
npm.cmd run package -- --out .tmp-verify.vsix
```

Inspect the VSIX file list from `vsce` output. It must not include:

- `.github/`
- `.npm-cache/`
- `node_modules/`
- `src/`
- local `.tmp*.vsix` files

For documentation-only changes, full test runs are optional, but still check `git status --short` before committing.

## Git Policy

- Keep changes scoped to the requested task.
- Do not revert user changes unless explicitly requested.
- Do not commit generated build output, dependency folders, npm cache files, or VSIX artifacts.
- Before committing, verify the diff and staged files.
