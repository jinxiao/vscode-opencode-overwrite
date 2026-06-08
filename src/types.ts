export type AgentMode = "chat" | "agent";

export interface OpenCodeHealth {
  version?: string;
  time?: number;
}

export interface OpenCodeSession {
  id: string;
  title?: string;
  directory: string;
  time: {
    created?: number;
    updated: number;
  };
}

export interface OpenCodeMessage {
  id?: string;
  info: {
    role: string;
    sessionID?: string;
    time?: {
      created?: number;
    };
  };
  parts: OpenCodePart[];
}

export type OpenCodePart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

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
  range?: {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  };
  languageId?: string;
  text: string;
  truncated: boolean;
  createdAt: number;
}

export interface ChatMessageView {
  id: string;
  role: string;
  text: string;
  createdAt?: number;
}

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

export interface ModelView {
  id: string;
  name: string;
  providerID: string;
  providerName?: string;
}

export interface FileSuggestion {
  path: string;
  label: string;
}

export type WebviewToExtensionMessage =
  | { type: "initialize" }
  | { type: "refresh" }
  | { type: "sendMessage"; text: string }
  | { type: "selectSession"; sessionId: string }
  | { type: "createSession" }
  | { type: "selectModel"; modelId: string }
  | { type: "selectAgent"; agentId: string }
  | { type: "setMode"; mode: AgentMode }
  | { type: "runCommand"; command: string; argumentsText?: string }
  | { type: "addContext" }
  | { type: "clearContext" }
  | { type: "searchFiles"; query: string };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: AgentViewState }
  | { type: "busy"; value: boolean; message?: string }
  | { type: "error"; message: string }
  | { type: "fileSuggestions"; query: string; suggestions: FileSuggestion[] };
