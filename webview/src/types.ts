export type AgentMode = "chat" | "agent";

export interface AgentViewState {
  connected: boolean;
  serverUrl: string;
  status: string;
  workspacePath?: string;
  mode: AgentMode;
  selectedAgentId?: string;
  sessions: SessionView[];
  activeSessionId?: string;
  messages: ChatMessageView[];
  models: ModelView[];
  selectedModelId?: string;
  agents: OpenCodeAgent[];
  commands: OpenCodeCommand[];
  context: ContextAttachment[];
}

export interface SessionView {
  id: string;
  title: string;
  directory: string;
  updated: number;
  summary?: string;
  updatedLabel?: string;
}

export interface ChatMessageView {
  id: string;
  role: string;
  text: string;
  createdAt?: number;
}

export interface ModelView {
  id: string;
  name: string;
  providerID: string;
  providerName?: string;
}

export interface OpenCodeAgent {
  id: string;
  name: string;
  description?: string;
}

export interface OpenCodeCommand {
  id: string;
  name: string;
  description?: string;
  agent?: string;
  model?: string;
  source?: "command" | "mcp" | "skill";
  subtask?: boolean;
  hints: string[];
}

export interface ContextAttachment {
  id: string;
  label: string;
  path: string;
  text: string;
  truncated: boolean;
  createdAt: number;
}

export interface FileSuggestion {
  path: string;
  label: string;
}

export type ExtensionMessage =
  | { type: "state"; state: AgentViewState }
  | { type: "busy"; value: boolean; message?: string }
  | { type: "error"; message: string }
  | { type: "fileSuggestions"; query: string; suggestions: FileSuggestion[] };
