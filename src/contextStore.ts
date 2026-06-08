import * as path from "path";
import * as vscode from "vscode";
import { ContextAttachment } from "./types";
import { workspaceKey } from "./workspace";

const CONTEXT_KEY = "opencode.agent.context";

export class ContextStore {
  public constructor(private readonly context: vscode.ExtensionContext) {}

  public get(workspacePath: string, sessionId: string): ContextAttachment[] {
    return this.context.workspaceState.get<ContextAttachment[]>(
      this.stateKey(workspacePath, sessionId),
      []
    );
  }

  public async clear(workspacePath: string, sessionId: string): Promise<void> {
    await this.context.workspaceState.update(this.stateKey(workspacePath, sessionId), []);
  }

  public async addFromEditor(
    workspacePath: string,
    sessionId: string,
    editor: vscode.TextEditor
  ): Promise<ContextAttachment> {
    const selection = editor.selection;
    const hasSelection = !selection.isEmpty;
    const document = editor.document;
    const text = hasSelection ? document.getText(selection) : document.getText();
    const attachment = this.createAttachment(
      workspacePath,
      document.uri.fsPath,
      document.languageId,
      text,
      hasSelection ? selection : undefined
    );
    await this.add(workspacePath, sessionId, attachment);
    return attachment;
  }

  public async addFromUri(
    workspacePath: string,
    sessionId: string,
    uri: vscode.Uri
  ): Promise<ContextAttachment | undefined> {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type !== vscode.FileType.File) {
      return undefined;
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(bytes).toString("utf8");
    const attachment = this.createAttachment(workspacePath, uri.fsPath, undefined, text);
    await this.add(workspacePath, sessionId, attachment);
    return attachment;
  }

  public buildPromptPrefix(attachments: readonly ContextAttachment[]): string {
    if (!attachments.length) {
      return "";
    }

    const blocks = attachments.map((attachment) => {
      const range = attachment.range
        ? `:${attachment.range.startLine + 1}-${attachment.range.endLine + 1}`
        : "";
      return [
        `File: ${attachment.path}${range}${attachment.truncated ? " (truncated)" : ""}`,
        "```",
        attachment.text,
        "```"
      ].join("\n");
    });

    return [
      "Additional VS Code context attached by the user:",
      "",
      ...blocks,
      "",
      "Use this context when relevant."
    ].join("\n");
  }

  private async add(
    workspacePath: string,
    sessionId: string,
    attachment: ContextAttachment
  ): Promise<void> {
    const maxItems = vscode.workspace
      .getConfiguration("opencodeVscode")
      .get<number>("context.maxItems", 20);
    const current = this.get(workspacePath, sessionId);
    const deduped = current.filter((item) => item.id !== attachment.id);
    await this.context.workspaceState.update(
      this.stateKey(workspacePath, sessionId),
      [...deduped, attachment].slice(-maxItems)
    );
  }

  private createAttachment(
    workspacePath: string,
    fsPath: string,
    languageId: string | undefined,
    text: string,
    range?: vscode.Range
  ): ContextAttachment {
    const maxBytes = vscode.workspace
      .getConfiguration("opencodeVscode")
      .get<number>("context.maxFileBytes", 204800);
    const buffer = Buffer.from(text, "utf8");
    const truncated = buffer.byteLength > maxBytes;
    const finalText = truncated ? buffer.subarray(0, maxBytes).toString("utf8") : text;
    const relativePath = path.relative(workspacePath, fsPath) || path.basename(fsPath);

    return {
      id: `${relativePath}:${range?.start.line ?? 0}:${range?.end.line ?? 0}`,
      label: range ? `${relativePath}:${range.start.line + 1}` : relativePath,
      path: relativePath,
      range: range
        ? {
            startLine: range.start.line,
            startCharacter: range.start.character,
            endLine: range.end.line,
            endCharacter: range.end.character
          }
        : undefined,
      languageId,
      text: finalText,
      truncated,
      createdAt: Date.now()
    };
  }

  private stateKey(workspacePath: string, sessionId: string): string {
    return `${CONTEXT_KEY}.${workspaceKey(workspacePath)}.${sessionId}`;
  }
}
