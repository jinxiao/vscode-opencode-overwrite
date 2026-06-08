# OpenCode Agent Extension Requirements

## Goal

Build a standalone OpenCode agent extension for VS Code. The extension must not
try to replace GitHub Copilot or intercept VS Code's native Chat model picker.
It should provide its own OpenCode-focused sidebar experience for sessions,
chat, agent work, file context, models, and slash commands.

## User Experience

- OpenCode appears as a dedicated Activity Bar entry.
- Opening the view shows the current workspace session, message history, context
  attachments, and a bottom composer containing input, agent selection, model
  selection, slash commands, file mentions, and send controls.
- Users can chat normally without `@opencode` because the sidebar is fully owned
  by this extension.
- Users can select an OpenCode agent from the composer. There is no separate
  Chat/Agent mode toggle in the sidebar.
- Users can select an existing OpenCode session or create a new one.
- If the user does not switch sessions, all requests continue in the same
  session context.
- The selected session is remembered per workspace and restored after VS Code
  restarts.
- Users can attach editor selections, current files, and Explorer file
  selections as context for the active session.
- Users can run OpenCode slash commands, including custom commands returned by
  the OpenCode server.

## Non Goals

- Do not register a VS Code native chat participant.
- Do not register a VS Code language model provider.
- Do not disable or modify GitHub Copilot settings.
- Do not provide inline completions in the rewrite MVP.
- Do not implement a separate approval system for OpenCode tools. Tool
  permissions are controlled by the user's OpenCode configuration.

## Functional Requirements

- Server lifecycle:
  - Connect to `opencodeVscode.serverUrl` when configured.
  - Otherwise start `opencode serve --hostname 127.0.0.1 --port 4096` in the
    active workspace.
  - Show connection status in a status bar item and the sidebar.
- Sessions:
  - List workspace sessions from `GET /session`.
  - Create a session with `POST /session`.
  - Read messages with `GET /session/{id}/message`.
  - Send normal messages with `POST /session/{id}/message`.
  - Persist the active session id in `workspaceState`.
- Agents:
  - Discover agents from OpenCode when available.
  - Expose the active agent in the composer.
  - If no explicit agent is selected, omit the agent field and use OpenCode's
    default behavior.
- Models:
  - Discover models from `/config/providers` and `/provider`.
  - Expose model ids as `provider/model`.
  - Store selected model per workspace.
- Context:
  - Store context attachments per `workspace + sessionId`.
  - Support editor selection, whole active file, and Explorer file selection.
  - Limit each file attachment to 200 KB and each session to 20 attachments.
  - Include context as a prefixed text block before each user prompt.
  - Support inline `@filename` mentions in the composer and resolve them to
    workspace file context for the sent prompt.
- Slash commands:
  - Discover commands from `GET /api/command` for the active workspace, with
    fallback to `GET /command` for older OpenCode servers.
  - Execute slash commands with `POST /session/{id}/command`.
  - Treat composer input starting with `/` as a slash command and show the
    dynamic command menu inside the composer.
  - Preserve OpenCode command metadata including source, hints, agent, model,
    and subtask flags.

## Success Criteria

- A VSIX can be built and installed.
- The sidebar can start/connect to OpenCode and create or restore a session.
- Messages sent from the sidebar reach OpenCode using the active session.
- Session selection persists across VS Code restarts.
- File context is visible in the sidebar and included in the next message.
- Slash commands returned by OpenCode can be selected and executed.
