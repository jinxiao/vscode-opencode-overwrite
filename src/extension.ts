import * as vscode from "vscode";
import { ContextStore } from "./contextStore";
import { OpenCodeClient } from "./opencodeClient";
import { SessionManager } from "./sessionManager";
import { OpenCodeAgentViewProvider } from "./webviewProvider";
import { activeWorkspacePath } from "./workspace";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("OpenCode");
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  const client = new OpenCodeClient(output);
  const sessions = new SessionManager(context, client);
  const contextStore = new ContextStore(context);
  const viewProvider = new OpenCodeAgentViewProvider(
    context,
    client,
    sessions,
    contextStore,
    output
  );

  status.command = "opencode.openAgent";
  status.text = "$(sparkle) OpenCode";
  status.tooltip = "Open OpenCode Agent";
  status.show();

  context.subscriptions.push(
    output,
    status,
    client,
    vscode.window.registerWebviewViewProvider(
      OpenCodeAgentViewProvider.viewType,
      viewProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    ),
    vscode.commands.registerCommand("opencode.openAgent", async () => {
      await viewProvider.reveal();
    }),
    vscode.commands.registerCommand("opencode.newSession", async () => {
      await viewProvider.createSession();
    }),
    vscode.commands.registerCommand("opencode.selectSession", async () => {
      await viewProvider.selectSession();
    }),
    vscode.commands.registerCommand(
      "opencode.addContext",
      async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
        await viewProvider.addContextFromCommand(uri, uris);
      }
    ),
    vscode.commands.registerCommand("opencode.clearContext", async () => {
      await viewProvider.clearContext();
    }),
    vscode.commands.registerCommand("opencode.runSlashCommand", async () => {
      await viewProvider.runSlashCommandFromCommand();
    }),
    vscode.commands.registerCommand("opencode.showStatus", async () => {
      await showStatus(client, status);
    })
  );

  const workspacePath = activeWorkspacePath();
  if (workspacePath) {
    void client
      .ensureReady(workspacePath)
      .then(() => {
        status.text = "$(check) OpenCode";
        status.tooltip = `OpenCode connected at ${client.url}`;
      })
      .catch((error) => {
        status.text = "$(warning) OpenCode";
        status.tooltip = `OpenCode unavailable: ${String(error)}`;
        output.appendLine(`OpenCode activation check failed: ${String(error)}`);
      });
  }
}

export function deactivate(): void {
  // Registered disposables handle cleanup.
}

async function showStatus(
  client: OpenCodeClient,
  status: vscode.StatusBarItem
): Promise<void> {
  const workspacePath = activeWorkspacePath();
  try {
    if (workspacePath) {
      await client.ensureReady(workspacePath);
    }
    const health = await client.health();
    status.text = "$(check) OpenCode";
    status.tooltip = `OpenCode connected at ${client.url}`;
    vscode.window.showInformationMessage(
      `OpenCode is connected (${health.version ?? "unknown version"}).`
    );
  } catch (error) {
    status.text = "$(warning) OpenCode";
    status.tooltip = `OpenCode unavailable: ${String(error)}`;
    vscode.window.showWarningMessage(`OpenCode unavailable at ${client.url}: ${String(error)}`);
  }
}
