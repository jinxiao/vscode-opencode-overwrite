# OpenCode Copilot Replacement

VS Code extension that replaces GitHub Copilot inline completions with OpenCode-powered inline completions.

## What it does

- Disables GitHub Copilot inline completion settings at workspace scope on activation.
- Keeps `editor.inlineSuggest.enabled` turned on so VS Code can render OpenCode ghost-text completions.
- Connects to an OpenCode HTTP server, or starts `opencode serve --hostname 127.0.0.1 --port 4096`.
- Reads only OpenCode sessions whose `directory` matches the current workspace.
- Registers an inline completion provider for file-backed documents.

## Requirements

- VS Code `1.92.0` or newer.
- OpenCode CLI available as `opencode`, or configure `opencodeVscode.opencodePath`.
- A configured OpenCode provider/model. This extension reuses OpenCode's local server and does not manage model API keys.

## Commands

- `OpenCode: Replace Copilot Completions`
- `OpenCode: Restore Copilot Settings`
- `OpenCode: Refresh Current Project Sessions`
- `OpenCode: Show Connection Status`

## Development

```powershell
npm install
npm run compile
npm run test
```

Use `F5` in VS Code to launch an Extension Development Host.

## Release

GitHub Actions publishes a VSIX to GitHub Releases when a `v*` tag is pushed.

```powershell
npm version patch
git push origin main
git push origin v0.1.1
```

Replace `v0.1.1` with the version tag created by `npm version`.
