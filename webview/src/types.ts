export type AgentMode = "chat" | "agent";

export interface AgentViewState {
  connected: boolean;
  serverUrl: string;
  status: string;
  workspacePath?: string;
  mode: AgentMode;
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
}

export interface ContextAttachment {
  id: string;
  label: string;
  path: string;
  text: string;
  truncated: boolean;
  createdAt: number;
}

export type ExtensionMessage =
  | { type: "state"; state: AgentViewState }
  | { type: "busy"; value: boolean; message?: string }
  | { type: "error"; message: string };
