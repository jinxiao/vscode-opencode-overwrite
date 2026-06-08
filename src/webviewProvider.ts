import * as path from "path";
import * as vscode from "vscode";
import { parseSlashCommandInput } from "./commandParsing";
import { ContextStore } from "./contextStore";
import { OpenCodeClient } from "./opencodeClient";
import { FALLBACK_OPENCODE_MODEL } from "./openCodeModels";
import { SessionManager } from "./sessionManager";
import {
  AgentMode,
  AgentViewState,
  ChatMessageView,
  ExtensionToWebviewMessage,
  OpenCodeAgent,
  OpenCodeMessage,
  WebviewToExtensionMessage
} from "./types";
import { activeWorkspacePath } from "./workspace";

const MODE_KEY = "opencode.agent.mode";
const MODEL_KEY = "opencode.agent.model";

export class OpenCodeAgentViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "opencode.agentView";

  private view: vscode.WebviewView | undefined;
  private lastState: AgentViewState | undefined;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly client: OpenCodeClient,
    private readonly sessions: SessionManager,
    private readonly contextStore: ContextStore,
    private readonly output: vscode.OutputChannel
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "media", "webview"))
      ]
    };
    webviewView.webview.html = this.html(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      void this.handleMessage(message);
    });
  }

  public async reveal(): Promise<void> {
    await vscode.commands.executeCommand(`${OpenCodeAgentViewProvider.viewType}.focus`);
    await this.refresh();
  }

  public async refresh(): Promise<void> {
    await this.withBusy("Refreshing OpenCode...", async () => {
      const state = await this.buildState();
      this.post({ type: "state", state });
    });
  }

  public async createSession(): Promise<void> {
    await this.withBusy("Creating session...", async () => {
      const workspacePath = this.requireWorkspace();
      await this.ensureReady(workspacePath);
      await this.sessions.createSession(workspacePath);
      await this.refresh();
    });
  }

  public async selectSession(): Promise<void> {
    const workspacePath = this.requireWorkspace();
    await this.ensureReady(workspacePath);
    const sessions = await this.sessions.listWorkspaceSessions(workspacePath);
    const selected = await vscode.window.showQuickPick(
      sessions.map((session) => ({
        label: session.title || "Untitled OpenCode session",
        description: session.id,
        detail: session.directory,
        session
      })),
      { title: "Select OpenCode Session" }
    );
    if (!selected) {
      return;
    }
    await this.sessions.selectSession(workspacePath, selected.session.id);
    await this.refresh();
  }

  public async addContextFromCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
    const workspacePath = this.requireWorkspace();
    await this.ensureReady(workspacePath);
    const session = await this.sessions.getActiveSession(workspacePath);
    const selectedUris = uris?.length ? uris : uri ? [uri] : [];

    if (selectedUris.length) {
      let added = 0;
      for (const selectedUri of selectedUris) {
        const attachment = await this.contextStore.addFromUri(
          workspacePath,
          session.id,
          selectedUri
        );
        if (attachment) {
          added += 1;
        }
      }
      vscode.window.showInformationMessage(`Added ${added} file(s) to OpenCode context.`);
      await this.refresh();
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("OpenCode needs an active editor or selected file.");
      return;
    }

    const attachment = await this.contextStore.addFromEditor(workspacePath, session.id, editor);
    vscode.window.showInformationMessage(`Added ${attachment.label} to OpenCode context.`);
    await this.refresh();
  }

  public async clearContext(): Promise<void> {
    const workspacePath = this.requireWorkspace();
    const session = await this.sessions.getActiveSession(workspacePath);
    await this.contextStore.clear(workspacePath, session.id);
    await this.refresh();
  }

  public async runSlashCommandFromCommand(): Promise<void> {
    const workspacePath = this.requireWorkspace();
    await this.ensureReady(workspacePath);
    const commands = await this.client.listCommands();
    const selected = await vscode.window.showQuickPick(
      commands.map((command) => ({
        label: command.name.startsWith("/") ? command.name : `/${command.id}`,
        description: command.description,
        command
      })),
      { title: "Run OpenCode Slash Command" }
    );
    if (!selected) {
      return;
    }
    const argumentsText = await vscode.window.showInputBox({
      title: selected.label,
      prompt: "Optional command arguments"
    });
    await this.runCommand(selected.command.id, argumentsText ?? "");
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    try {
      switch (message.type) {
        case "initialize":
        case "refresh":
          await this.refresh();
          return;
        case "sendMessage":
          await this.sendComposerText(message.text);
          return;
        case "selectSession":
          await this.selectSessionById(message.sessionId);
          return;
        case "createSession":
          await this.createSession();
          return;
        case "selectModel":
          await this.context.workspaceState.update(MODEL_KEY, message.modelId);
          await this.refresh();
          return;
        case "setMode":
          await this.context.workspaceState.update(MODE_KEY, message.mode);
          await this.refresh();
          return;
        case "runCommand":
          await this.runCommand(message.command, message.argumentsText ?? "");
          return;
        case "clearContext":
          await this.clearContext();
          return;
      }
    } catch (error) {
      this.reportError(error);
    }
  }

  private async sendComposerText(text: string): Promise<void> {
    const parsed = parseSlashCommandInput(text);
    if (parsed) {
      await this.runCommand(parsed.command, parsed.argumentsText);
      return;
    }

    await this.withBusy("Sending message...", async () => {
      const workspacePath = this.requireWorkspace();
      await this.ensureReady(workspacePath);
      const state = await this.buildState();
      const activeSessionId = state.activeSessionId;
      if (!activeSessionId) {
        throw new Error("OpenCode has no active session.");
      }
      const prompt = this.withContext(text, state);
      await this.client.sendMessage(activeSessionId, prompt, this.requestOptions(state));
      await this.refresh();
    });
  }

  private async runCommand(command: string, argumentsText: string): Promise<void> {
    await this.withBusy(`Running /${command.replace(/^\//, "")}...`, async () => {
      const workspacePath = this.requireWorkspace();
      await this.ensureReady(workspacePath);
      const state = await this.buildState();
      const activeSessionId = state.activeSessionId;
      if (!activeSessionId) {
        throw new Error("OpenCode has no active session.");
      }
      await this.client.runCommand(
        activeSessionId,
        command,
        argumentsText,
        this.requestOptions(state)
      );
      await this.refresh();
    });
  }

  private async selectSessionById(sessionId: string): Promise<void> {
    const workspacePath = this.requireWorkspace();
    await this.sessions.selectSession(workspacePath, sessionId);
    await this.refresh();
  }

  private async buildState(): Promise<AgentViewState> {
    const workspacePath = activeWorkspacePath();
    if (!workspacePath) {
      return emptyState(this.client.url, "Open a workspace to use OpenCode.");
    }

    await this.ensureReady(workspacePath);
    const [models, agents, commands] = await Promise.all([
      this.client.listProviderModels(),
      this.client.listAgents(),
      this.client.listCommands()
    ]);
    const activeSession = await this.sessions.getActiveSession(workspacePath);
    const sessions = await this.sessions.listWorkspaceSessions(workspacePath);
    const messages = await this.client.sessionMessages(activeSession.id);
    const mode = this.context.workspaceState.get<AgentMode>(MODE_KEY, "chat");
    const selectedModelId =
      this.context.workspaceState.get<string>(MODEL_KEY) ?? models.find((model) => !model.isFallback)?.id ?? models[0]?.id;
    const context = this.contextStore.get(workspacePath, activeSession.id);

    const state: AgentViewState = {
      connected: true,
      serverUrl: this.client.url,
      status: "Connected",
      workspacePath,
      mode,
      sessions: this.sessions.toSessionViews(sessions),
      activeSessionId: activeSession.id,
      messages: messages.map(toMessageView),
      models: models.map((model) => ({
        id: model.id,
        name: model.name,
        providerID: model.providerID,
        providerName: model.providerName
      })),
      selectedModelId,
      agents,
      commands,
      context
    };
    this.lastState = state;
    return state;
  }

  private requestOptions(state: AgentViewState): { model?: string; agent?: string } {
    return {
      model:
        state.selectedModelId && state.selectedModelId !== FALLBACK_OPENCODE_MODEL.id
          ? state.selectedModelId
          : undefined,
      agent: preferredAgent(state.mode, state.agents)
    };
  }

  private withContext(text: string, state: AgentViewState): string {
    const prefix = this.contextStore.buildPromptPrefix(state.context);
    return prefix ? `${prefix}\n\nUser request:\n${text}` : text;
  }

  private async ensureReady(workspacePath: string): Promise<void> {
    await this.client.ensureReady(workspacePath);
  }

  private requireWorkspace(): string {
    const workspacePath = activeWorkspacePath();
    if (!workspacePath) {
      throw new Error("OpenCode Agent needs an open workspace.");
    }
    return workspacePath;
  }

  private async withBusy<T>(message: string, fn: () => Promise<T>): Promise<T> {
    this.post({ type: "busy", value: true, message });
    try {
      return await fn();
    } catch (error) {
      this.reportError(error);
      throw error;
    } finally {
      this.post({ type: "busy", value: false });
    }
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.output.appendLine(`OpenCode Agent failed: ${message}`);
    this.post({ type: "error", message });
  }

  private post(message: ExtensionToWebviewMessage): void {
    void this.view?.webview.postMessage(message);
  }

  private html(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "media", "webview", "index.js"))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "media", "webview", "index.css"))
    );
    const nonce = randomNonce();

    return [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">`,
      `<link rel="stylesheet" href="${styleUri}">`,
      "<title>OpenCode Agent</title>",
      "</head>",
      "<body>",
      '<div id="root"></div>',
      `<script nonce="${nonce}" type="module" src="${scriptUri}"></script>`,
      "</body>",
      "</html>"
    ].join("");
  }
}

function emptyState(serverUrl: string, status: string): AgentViewState {
  return {
    connected: false,
    serverUrl,
    status,
    mode: "chat",
    sessions: [],
    messages: [],
    models: [],
    agents: [],
    commands: [],
    context: []
  };
}

function toMessageView(message: OpenCodeMessage): ChatMessageView {
  return {
    id: message.id ?? `${message.info.role}-${message.info.time?.created ?? Math.random()}`,
    role: message.info.role,
    text: message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join("\n"),
    createdAt: message.info.time?.created
  };
}

function preferredAgent(mode: AgentMode, agents: readonly OpenCodeAgent[]): string | undefined {
  const preferred = mode === "chat" ? "plan" : "build";
  return agents.find((agent) => agent.id === preferred || agent.name === preferred)?.id;
}

function randomNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}
