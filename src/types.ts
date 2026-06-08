export interface OpenCodeHealth {
  healthy: boolean;
  version: string;
}

export interface OpenCodeProject {
  id: string;
  worktree: string;
  vcsDir?: string;
  vcs?: string;
  time?: {
    created: number;
    initialized?: number;
  };
}

export interface OpenCodeSession {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  version?: string;
  time: {
    created: number;
    updated: number;
    compacting?: number;
  };
  summary?: {
    additions?: number;
    deletions?: number;
    files?: number;
    diffs?: unknown[];
  };
}

export interface OpenCodeMessage {
  info: {
    id: string;
    sessionID: string;
    role: "user" | "assistant";
    time?: {
      created: number;
      completed?: number;
    };
    error?: unknown;
  };
  parts: OpenCodePart[];
}

export type OpenCodePart =
  | {
      type: "text";
      text: string;
      id?: string;
      synthetic?: boolean;
      ignored?: boolean;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export interface SessionSummary {
  id: string;
  title: string;
  updated: number;
  excerpt: string;
}

export interface CompletionContext {
  languageId: string;
  filePath: string;
  workspacePath: string;
  line: number;
  character: number;
  before: string;
  after: string;
  sessionSummaries: SessionSummary[];
}
