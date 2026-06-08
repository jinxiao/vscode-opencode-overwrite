# OpenCode Agent Implementation Plan

## Phase 1: Documentation and Manifest

- Add requirements and architecture documentation.
- Replace the old native Chat/Copilot contributions with an Activity Bar
  Webview view.
- Add commands for opening the agent, creating/selecting sessions, adding file
  context, running slash commands, refreshing status, and clearing context.

## Phase 2: Core Extension Services

- Rewrite the OpenCode client around typed endpoints.
- Add session manager with workspace-scoped persistence.
- Add context store with size and count limits.
- Add model, agent, and command normalization helpers.

## Phase 3: React Webview

- Add React + Vite build.
- Implement the sidebar UI:
  - collapsible session list
  - message timeline
  - context chips
  - markdown rendering
  - input composer with agent selector, model selector, slash commands, and
    `@filename` suggestions

## Phase 4: VS Code Integration

- Wire commands and context menus to extension services.
- Support editor selection, active file, and Explorer multi-file context.
- Update status bar and README.

## Phase 5: Validation and Release

- Add unit tests for session, context, command parsing, and model normalization.
- Run `npm.cmd run test`.
- Run `npm.cmd run package -- --out .tmp-opencode-agent.vsix`.
- Bump version and publish when verified.
