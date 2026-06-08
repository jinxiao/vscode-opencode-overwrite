# OpenCode Agent Extension Architecture

## Main Components

- Extension host:
  - Registers commands, Activity Bar view, status bar, and context menu actions.
  - Owns all filesystem, VS Code API, and OpenCode server access.
- React Webview:
  - Renders the OpenCode agent UI.
  - Sends typed messages to the extension host.
  - Receives state snapshots and streaming/status updates.
- OpenCode client:
  - Typed HTTP wrapper around the OpenCode server.
  - Starts a local OpenCode server when no explicit server URL is configured.
- Session manager:
  - Resolves, creates, selects, and persists the active session per workspace.
- Context store:
  - Stores context attachments by workspace and session id.
- Command runner:
  - Lists OpenCode slash commands from the current workspace and executes them
    in the active session.

## Data Flow

1. The webview sends `initialize`.
2. The extension ensures the OpenCode server is ready.
3. The extension loads sessions, active session, messages, models, agents,
  commands, and context attachments.
4. The extension posts a `state` message to the webview.
5. User actions in the webview send typed requests such as `sendMessage`,
   `selectSession`, `createSession`, `selectModel`, `setMode`, `runCommand`,
   and `clearContext`.
6. The extension updates OpenCode or local state, then posts a fresh `state`.

## Webview Message Protocol

Messages from webview to extension:

- `initialize`
- `refresh`
- `sendMessage` with `{ text }`
- `selectSession` with `{ sessionId }`
- `createSession`
- `selectModel` with `{ modelId }`
- `setMode` with `{ mode: "chat" | "agent" }`
- `runCommand` with `{ command, argumentsText }`
- `clearContext`

Messages from extension to webview:

- `state` with the full view model
- `busy` with `{ value, message }`
- `error` with `{ message }`

## OpenCode Request Policy

- Normal messages use the active session id.
- Slash commands are discovered from `GET /api/command` with the workspace
  location query and use the active session id for execution.
- Model id is sent only when the user has selected a concrete model.
- Agent id is selected from the current mode only when the preferred agent
  exists.
- Context is prepended to the prompt as text. The source attachments remain
  local to VS Code state and are not separately persisted in OpenCode.

## Packaging

- React/Vite output is built into `media/webview`.
- TypeScript extension output remains in `out`.
- VSIX includes compiled extension code, webview assets, README, LICENSE, and
  package manifest.
