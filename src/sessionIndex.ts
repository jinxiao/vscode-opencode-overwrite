import * as path from "path";
import * as vscode from "vscode";
import { OpenCodeClient } from "./opencodeClient";
import { OpenCodeMessage, OpenCodeSession, SessionSummary } from "./types";
import { trimMiddle } from "./completionContext";

export class SessionIndex {
  private summaries: SessionSummary[] = [];
  private lastRefresh = 0;

  public constructor(
    private readonly client: OpenCodeClient,
    private readonly output: vscode.OutputChannel
  ) {}

  public async refresh(
    workspacePath: string,
    token?: vscode.CancellationToken
  ): Promise<void> {
    const sessions = await this.client.listSessions(token);
    const scoped = sessions
      .filter((session) => isWorkspaceSession(session, workspacePath))
      .sort((a, b) => b.time.updated - a.time.updated)
      .slice(0, 8);

    const summaries: SessionSummary[] = [];
    for (const session of scoped) {
      if (token?.isCancellationRequested) {
        break;
      }

      summaries.push({
        id: session.id,
        title: session.title || "Untitled OpenCode session",
        updated: session.time.updated,
        excerpt: await this.buildExcerpt(session.id, token)
      });
    }

    this.summaries = summaries;
    this.lastRefresh = Date.now();
    this.output.appendLine(
      `Loaded ${summaries.length} OpenCode session summaries for ${workspacePath}.`
    );
  }

  public async getSummaries(
    workspacePath: string,
    token?: vscode.CancellationToken
  ): Promise<SessionSummary[]> {
    if (!this.lastRefresh || Date.now() - this.lastRefresh > 300000) {
      try {
        await this.refresh(workspacePath, token);
      } catch (error) {
        this.output.appendLine(`OpenCode session refresh failed: ${String(error)}`);
      }
    }

    return this.summaries;
  }

  private async buildExcerpt(
    sessionId: string,
    token?: vscode.CancellationToken
  ): Promise<string> {
    try {
      const messages = await this.client.sessionMessages(sessionId, token);
      return trimMiddle(
        messages
          .slice(-6)
          .map(messageToText)
          .filter(Boolean)
          .join("\n"),
        1000
      );
    } catch (error) {
      this.output.appendLine(
        `Failed to read OpenCode session ${sessionId}: ${String(error)}`
      );
      return "";
    }
  }
}

function isWorkspaceSession(
  session: OpenCodeSession,
  workspacePath: string
): boolean {
  const sessionDir = normalizePath(session.directory);
  const root = normalizePath(workspacePath);

  return sessionDir === root || sessionDir.startsWith(`${root}${path.sep}`);
}

function normalizePath(value: string): string {
  return path.resolve(value).toLowerCase();
}

function messageToText(message: OpenCodeMessage): string {
  const role = message.info.role;
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");

  return text ? `${role}: ${text}` : "";
}
