import * as vscode from "vscode";
import { OpenCodeInlineCompletionProvider } from "./completionProvider";
import { OpenCodeClient } from "./opencodeClient";
import { SessionIndex } from "./sessionIndex";
import { SettingsManager } from "./settings";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel("OpenCode");
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  const settings = new SettingsManager(context, output);
  const client = new OpenCodeClient(output);
  const sessions = new SessionIndex(client, output);
  const provider = new OpenCodeInlineCompletionProvider(client, sessions, output);

  status.command = "opencode.showStatus";
  status.text = "$(sparkle) OpenCode";
  status.tooltip = "OpenCode inline completions";
  status.show();

  context.subscriptions.push(
    output,
    status,
    client,
    vscode.languages.registerInlineCompletionItemProvider(
      [{ scheme: "file" }],
      provider
    ),
    vscode.commands.registerCommand("opencode.replaceCopilotNow", async () => {
      await settings.replaceCopilotCompletions();
      vscode.window.showInformationMessage(
        "OpenCode is now handling inline completions for this workspace."
      );
    }),
    vscode.commands.registerCommand("opencode.restoreCopilotSettings", async () => {
      await settings.restoreCopilotSettings();
    }),
    vscode.commands.registerCommand("opencode.refreshSessions", async () => {
      const workspacePath = activeWorkspacePath();
      if (!workspacePath) {
        vscode.window.showWarningMessage("OpenCode needs an open workspace to refresh sessions.");
        return;
      }

      await withStatus(status, "$(sync~spin) OpenCode sessions", async () => {
        await client.ensureReady(workspacePath);
        await sessions.refresh(workspacePath);
      });
      vscode.window.showInformationMessage("OpenCode session index refreshed.");
    }),
    vscode.commands.registerCommand("opencode.showStatus", async () => {
      await showStatus(client, status);
    })
  );

  if (settings.isEnabled() && settings.shouldDisableCopilotOnActivation()) {
    await settings.replaceCopilotCompletions();
  }

  const workspacePath = activeWorkspacePath();
  if (settings.isEnabled() && workspacePath) {
    void withStatus(status, "$(sync~spin) OpenCode", async () => {
      await client.ensureReady(workspacePath);
      await sessions.refresh(workspacePath);
    }).catch((error) => {
      status.text = "$(warning) OpenCode";
      status.tooltip = `OpenCode connection failed: ${String(error)}`;
      output.appendLine(`OpenCode activation failed: ${String(error)}`);
    });
  }
}

export function deactivate(): void {
  // Disposables registered in activate handle shutdown.
}

async function showStatus(
  client: OpenCodeClient,
  status: vscode.StatusBarItem
): Promise<void> {
  try {
    const health = await client.health();
    status.text = "$(check) OpenCode";
    status.tooltip = `OpenCode server healthy (${health.version ?? "unknown version"})`;
    vscode.window.showInformationMessage(
      `OpenCode server is healthy (${health.version ?? "unknown version"}).`
    );
  } catch (error) {
    status.text = "$(warning) OpenCode";
    status.tooltip = `OpenCode server is not reachable: ${String(error)}`;
    vscode.window.showWarningMessage(
      `OpenCode server is not reachable: ${String(error)}`
    );
  }
}

function activeWorkspacePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
  }

  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function withStatus<T>(
  status: vscode.StatusBarItem,
  text: string,
  fn: () => Promise<T>
): Promise<T> {
  const previousText = status.text;
  status.text = text;
  try {
    const result = await fn();
    status.text = "$(check) OpenCode";
    return result;
  } catch (error) {
    status.text = "$(warning) OpenCode";
    throw error;
  } finally {
    if (status.text === text) {
      status.text = previousText;
    }
  }
}
