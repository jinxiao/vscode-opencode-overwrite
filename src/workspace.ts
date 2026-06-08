import * as vscode from "vscode";

export function activeWorkspacePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
  }
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function workspaceKey(workspacePath: string): string {
  return workspacePath.toLowerCase();
}
