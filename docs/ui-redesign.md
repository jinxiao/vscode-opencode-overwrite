# OpenCode Agent UI Redesign

## Goal

Redesign the OpenCode Agent sidebar as a compact VS Code-native chat surface.
The extension owns the full conversation flow, so users type directly into the
sidebar without `@opencode` or VS Code's native chat model picker.

## Layout Nodes

- `HeaderStatus`: slim title row with OpenCode Agent, workspace label, and
  connection state.
- `SessionPanel`: collapsible session list with summaries, timestamps, active
  row highlight, and a new-session action.
- `MessageViewport`: scrollable conversation history with rendered markdown for
  OpenCode responses.
- `ContextStrip`: compact file/selection chips for context currently attached to
  the active session.
- `ComposerDock`: bottom input area containing the text box, Agent selector,
  Model selector, slash command trigger, `@filename` affordance, attachment
  action, and send/stop action.

## Composer Behavior

- Agent and Model selectors live inside the composer footer. There is no
  separate top configuration toolbar.
- Plain text sends directly to OpenCode using the active session.
- Typing `/` opens an inline command menu populated from OpenCode
  `GET /api/command` for the active workspace, grouped by command source.
- Typing `@` opens an inline workspace file suggestion menu.
- `Ctrl+Enter` sends the current prompt.
- When a request is running, sending is disabled and the composer shows the
  current busy state.

## Session Behavior

- Sessions are shown as a list, not a modal selector.
- If the user does not select another session, all prompts continue in the same
  active session.
- The session section can collapse so it never overlaps or pushes the composer
  out of reach.

## Visual Direction

- Match a VS Code dark sidebar: neutral surfaces, subtle row separators, rounded
  4-6px controls, and focused blue accents.
- Avoid redundant buttons. Keep only actions required for session creation,
  session collapse, context clearing, command/file insertion, and sending.
- Assistant output must render markdown elements including headings, lists,
  tables, inline code, and code blocks.
