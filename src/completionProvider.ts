import * as vscode from "vscode";
import { buildCompletionPrompt, extractInlineCompletion, trimMiddle } from "./completionContext";
import { OpenCodeClient } from "./opencodeClient";
import { SessionIndex } from "./sessionIndex";
import { CompletionContext } from "./types";

export class OpenCodeInlineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private lastRequest = 0;
  private cache:
    | {
        key: string;
        completion: string;
        expires: number;
      }
    | undefined;

  public constructor(
    private readonly client: OpenCodeClient,
    private readonly sessions: SessionIndex,
    private readonly output: vscode.OutputChannel
  ) {}

  public async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
    if (!this.shouldComplete(document, context)) {
      return undefined;
    }

    const config = vscode.workspace.getConfiguration("opencodeVscode");
    const debounceMs = config.get<number>("completion.debounceMs", 250);
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < debounceMs) {
      await delay(debounceMs - elapsed, token);
    }
    this.lastRequest = Date.now();

    if (token.isCancellationRequested) {
      return undefined;
    }

    const workspace = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspace) {
      return undefined;
    }

    const key = `${document.uri.toString()}:${document.version}:${position.line}:${position.character}`;
    if (this.cache && this.cache.key === key && this.cache.expires > Date.now()) {
      return toInlineItems(this.cache.completion, position);
    }

    try {
      await this.client.ensureReady(workspace.uri.fsPath);

      const completionContext = await this.buildContext(
        document,
        position,
        workspace.uri.fsPath,
        token
      );
      const prompt = buildCompletionPrompt(completionContext);
      const timeoutMs = config.get<number>("completion.maxLatencyMs", 2500);
      const raw = await this.client.complete(prompt, timeoutMs, token);
      const prefix = document.getText(
        new vscode.Range(new vscode.Position(position.line, 0), position)
      );
      const completion = extractInlineCompletion(raw, prefix);

      if (!completion.trim()) {
        return undefined;
      }

      this.cache = {
        key,
        completion,
        expires: Date.now() + 3000
      };

      return toInlineItems(completion, position);
    } catch (error) {
      this.output.appendLine(`OpenCode completion failed: ${String(error)}`);
      return undefined;
    }
  }

  private shouldComplete(
    document: vscode.TextDocument,
    context: vscode.InlineCompletionContext
  ): boolean {
    if (
      !vscode.workspace
        .getConfiguration("opencodeVscode")
        .get<boolean>("enabled", true)
    ) {
      return false;
    }

    if (document.uri.scheme !== "file" || document.isUntitled) {
      return false;
    }

    if (document.lineCount > 50000) {
      return false;
    }

    if (
      context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic &&
      document.languageId === "plaintext"
    ) {
      return false;
    }

    return true;
  }

  private async buildContext(
    document: vscode.TextDocument,
    position: vscode.Position,
    workspacePath: string,
    token: vscode.CancellationToken
  ): Promise<CompletionContext> {
    const contextLines = vscode.workspace
      .getConfiguration("opencodeVscode")
      .get<number>("completion.contextLines", 80);
    const beforeStart = new vscode.Position(
      Math.max(0, position.line - contextLines),
      0
    );
    const afterEndLine = Math.min(document.lineCount - 1, position.line + contextLines);
    const afterEnd = document.lineAt(afterEndLine).range.end;

    return {
      languageId: document.languageId,
      filePath: document.uri.fsPath,
      workspacePath,
      line: position.line,
      character: position.character,
      before: trimMiddle(
        document.getText(new vscode.Range(beforeStart, position)),
        12000
      ),
      after: trimMiddle(document.getText(new vscode.Range(position, afterEnd)), 12000),
      sessionSummaries: await this.sessions.getSummaries(workspacePath, token)
    };
  }
}

function toInlineItems(
  completion: string,
  position: vscode.Position
): vscode.InlineCompletionItem[] {
  return [
    new vscode.InlineCompletionItem(
      completion,
      new vscode.Range(position, position)
    )
  ];
}

function delay(ms: number, token: vscode.CancellationToken): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    token.onCancellationRequested(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
