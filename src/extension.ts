import * as vscode from "vscode";
import { createOpenCodeChatParticipant } from "./chatParticipant";
import { activeWorkspacePath, OPENCODE_MODEL_VENDOR } from "./chatText";
import { OpenCodeInlineCompletionProvider } from "./completionProvider";
import { OpenCodeLanguageModelProvider } from "./languageModelProvider";
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
  const languageModelProvider = new OpenCodeLanguageModelProvider(client, output);
  const chatParticipant = createOpenCodeChatParticipant(client, output);

  status.command = "opencode.showStatus";
  status.text = "$(sparkle) OpenCode";
  status.tooltip = "OpenCode inline completions and chat";
  status.show();

  context.subscriptions.push(
    output,
    status,
    client,
    vscode.languages.registerInlineCompletionItemProvider(
      [{ scheme: "file" }],
      provider
    ),
    vscode.lm.registerLanguageModelChatProvider(
      OPENCODE_MODEL_VENDOR,
      languageModelProvider
    ),
    chatParticipant,
    vscode.commands.registerCommand("opencode.replaceCopilotNow", async () => {
      await settings.replaceCopilotCompletions();
      await settings.preferOpenCodeChatModels();
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
    }),
    vscode.commands.registerCommand("opencode.openChat", async () => {
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: "@opencode "
      });
    })
  );

  if (settings.isEnabled() && settings.shouldDisableCopilotOnActivation()) {
    await settings.replaceCopilotCompletions();
    await settings.preferOpenCodeChatModels();
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
  const workspacePath = activeWorkspacePath();
  try {
    if (workspacePath) {
      await client.ensureReady(workspacePath);
    }
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
      `OpenCode server is not reachable at ${client.url}: ${String(error)}`
    );
  }
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
