# OpenCode Agent

Standalone OpenCode agent sidebar for VS Code.

This extension no longer tries to replace GitHub Copilot or route VS Code's
native Chat picker through OpenCode. Instead, it provides a dedicated OpenCode
Activity Bar view with its own sessions, chat composer, agent mode, model
selection, file context, and slash commands.

## Features

- Starts or connects to an OpenCode server.
- Shows a dedicated OpenCode sidebar.
- Lists and restores workspace OpenCode sessions.
- Keeps using the same session until you switch sessions.
- Supports Chat and Agent modes.
- Discovers OpenCode provider models and slash commands.
- Adds selected editor text, active files, and Explorer file selections to the
  current session context.
- Runs slash commands such as `/help`, `/init`, `/undo`, `/redo`, `/share`, and
  custom OpenCode commands returned by the server.

## Requirements

- VS Code `1.120.0` or newer.
- OpenCode CLI available as `opencode`, or configure
  `opencodeVscode.opencodePath`.
- A configured OpenCode provider/model. This extension uses your local OpenCode
  configuration and does not manage model API keys.

## Commands

- `OpenCode: Open Agent`
- `OpenCode: New Session`
- `OpenCode: Select Session`
- `OpenCode: Add Selection/File To Context`
- `OpenCode: Clear Current Context`
- `OpenCode: Run Slash Command`
- `OpenCode: Show Status`

## Development

```powershell
npm install
npm run compile
npm run test
```

The React webview is built with Vite into `media/webview`. The extension host
TypeScript is compiled into `out`.

## Release

GitHub Actions publishes a VSIX to GitHub Releases when a `v*` tag is pushed.
