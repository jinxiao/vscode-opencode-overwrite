# OpenCode Copilot Replacement

VS Code extension that replaces GitHub Copilot inline completions with OpenCode-powered inline completions.

## What it does

- Disables GitHub Copilot inline completion settings at workspace scope on activation.
- Keeps `editor.inlineSuggest.enabled` turned on so VS Code can render OpenCode ghost-text completions.
- Connects to an OpenCode HTTP server, or starts `opencode serve --hostname 127.0.0.1 --port 4096`.
- Reads only OpenCode sessions whose `directory` matches the current workspace.
- Registers an inline completion provider for file-backed documents.
- Registers OpenCode as a VS Code Chat model provider, discovers OpenCode provider models, and adds an `@opencode` chat participant as a fallback entry point.

## Requirements

- VS Code `1.120.0` or newer.
- OpenCode CLI available as `opencode`, or configure `opencodeVscode.opencodePath`.
- A configured OpenCode provider/model. This extension reuses OpenCode's local server and does not manage model API keys.

## Troubleshooting

If VS Code shows `OpenCode server is not reachable`, check the extension output channel named `OpenCode`.

Common fixes:

- Install the OpenCode CLI and make sure `opencode --help` works from a new terminal.
- If the CLI is not on `PATH`, set `opencodeVscode.opencodePath` to the full executable path.
- If you already run an OpenCode server yourself, set `opencodeVscode.serverUrl` to that server URL.
- On Windows, restart VS Code after changing `PATH` so the extension host receives the updated environment.

## Commands

- `OpenCode: Replace Copilot Completions`
- `OpenCode: Restore Copilot Settings`
- `OpenCode: Refresh Current Project Sessions`
- `OpenCode: Show Connection Status`
- `OpenCode: Open Chat`
- `OpenCode: Use OpenCode As Default Chat Model`

## Chat

Use one of these paths to make VS Code Chat call OpenCode:

- Run `OpenCode: Use OpenCode As Default Chat Model`, then type normally in VS Code Chat.
- Select one of the OpenCode-discovered models in the VS Code Chat model picker, then type normally.
- Type `@opencode` before your message.
- Run `OpenCode: Open Chat`, which refreshes OpenCode models, prefers OpenCode in VS Code settings, and opens Chat.

If the Chat picker still shows Gemini, Claude, or another non-OpenCode provider, plain messages will continue to use that selected provider because VS Code controls the active Chat model. Requests handled by an OpenCode model or `@opencode` are routed to the local OpenCode server.

The extension reads OpenCode models from `/config/providers` and `/provider`. Model IDs are exposed to VS Code as `provider/model`, for example `anthropic/claude-sonnet-4`, under the VS Code vendor `opencode`.

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
