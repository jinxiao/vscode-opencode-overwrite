import * as path from "path";
import * as vscode from "vscode";
import { OpenCodeClient } from "./opencodeClient";
import { OpenCodeSession, SessionView } from "./types";
import { workspaceKey } from "./workspace";

const ACTIVE_SESSION_KEY = "opencode.agent.activeSession";

export class SessionManager {
  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly client: OpenCodeClient
  ) {}

  public async listWorkspaceSessions(
    workspacePath: string,
    token?: vscode.CancellationToken
  ): Promise<OpenCodeSession[]> {
    const sessions = await this.client.listSessions(token);
    return sessions
      .filter((session) => isWorkspaceSession(session, workspacePath))
      .sort((left, right) => right.time.updated - left.time.updated);
  }

  public async getActiveSession(
    workspacePath: string,
    token?: vscode.CancellationToken
  ): Promise<OpenCodeSession> {
    const sessions = await this.listWorkspaceSessions(workspacePath, token);
    const savedId = this.context.workspaceState.get<string>(this.stateKey(workspacePath));
    const saved = savedId ? sessions.find((session) => session.id === savedId) : undefined;
    if (saved) {
      return saved;
    }

    const session = sessions[0] ?? (await this.createSession(workspacePath, token));
    await this.selectSession(workspacePath, session.id);
    return session;
  }

  public async createSession(
    workspacePath: string,
    token?: vscode.CancellationToken
  ): Promise<OpenCodeSession> {
    const session = await this.client.createSession("VS Code OpenCode Agent", token);
    await this.selectSession(workspacePath, session.id);
    return session;
  }

  public async selectSession(workspacePath: string, sessionId: string): Promise<void> {
    await this.context.workspaceState.update(this.stateKey(workspacePath), sessionId);
  }

  public toSessionViews(sessions: readonly OpenCodeSession[]): SessionView[] {
    return sessions.map((session) => ({
      id: session.id,
      title: session.title || "Untitled OpenCode session",
      directory: session.directory,
      updated: session.time.updated
    }));
  }

  private stateKey(workspacePath: string): string {
    return `${ACTIVE_SESSION_KEY}.${workspaceKey(workspacePath)}`;
  }
}

function isWorkspaceSession(session: OpenCodeSession, workspacePath: string): boolean {
  const sessionDir = normalizePath(session.directory);
  const root = normalizePath(workspacePath);
  return sessionDir === root || sessionDir.startsWith(`${root}${path.sep}`);
}

function normalizePath(value: string): string {
  return path.resolve(value).toLowerCase();
}
