import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as vscode from "vscode";
import {
  OpenCodeHealth,
  OpenCodeMessage,
  OpenCodeProject,
  OpenCodeSession,
  OpenCodePart
} from "./types";
import { OpenCodeModelInfo, normalizeOpenCodeModels } from "./openCodeModels";

const DEFAULT_SERVER_URL = "http://127.0.0.1:4096";

export class OpenCodeClient {
  private childProcess: ChildProcessWithoutNullStreams | undefined;
  private completionSessionId: string | undefined;
  private chatSessionId: string | undefined;
  private startupError: Error | undefined;

  public constructor(private readonly output: vscode.OutputChannel) {}

  public async ensureReady(workspacePath: string): Promise<void> {
    if (await this.tryHealth()) {
      return;
    }

    if (this.hasExplicitServerUrl()) {
      throw new Error(
        `OpenCode server is not reachable at ${this.serverUrl}. Check opencodeVscode.serverUrl.`
      );
    }

    this.startServer(workspacePath);
    await this.waitForHealth();
  }

  public async health(token?: vscode.CancellationToken): Promise<OpenCodeHealth> {
    return this.request<OpenCodeHealth>("/global/health", { method: "GET" }, 5000, token);
  }

  public get url(): string {
    return this.serverUrl;
  }

  public async currentProject(
    token?: vscode.CancellationToken
  ): Promise<OpenCodeProject> {
    return this.request<OpenCodeProject>("/project/current", { method: "GET" }, 5000, token);
  }

  public async listSessions(
    token?: vscode.CancellationToken
  ): Promise<OpenCodeSession[]> {
    const response = await this.request<OpenCodeSession[] | { data: OpenCodeSession[] }>(
      "/session",
      { method: "GET" },
      8000,
      token
    );
    return Array.isArray(response) ? response : response.data;
  }

  public async sessionMessages(
    sessionId: string,
    token?: vscode.CancellationToken
  ): Promise<OpenCodeMessage[]> {
    const response = await this.request<OpenCodeMessage[] | { data: OpenCodeMessage[] }>(
      `/session/${encodeURIComponent(sessionId)}/message`,
      { method: "GET" },
      8000,
      token
    );
    return Array.isArray(response) ? response : response.data;
  }

  public async listProviderModels(
    token?: vscode.CancellationToken
  ): Promise<OpenCodeModelInfo[]> {
    let configProviders: unknown;
    let providers: unknown;

    try {
      configProviders = await this.request<unknown>(
        "/config/providers",
        { method: "GET" },
        8000,
        token
      );
    } catch (error) {
      this.output.appendLine(`OpenCode /config/providers failed: ${formatError(error)}`);
    }

    try {
      providers = await this.request<unknown>(
        "/provider",
        { method: "GET" },
        8000,
        token
      );
    } catch (error) {
      this.output.appendLine(`OpenCode /provider failed: ${formatError(error)}`);
    }

    return normalizeOpenCodeModels(configProviders, providers);
  }

  public async complete(
    prompt: string,
    timeoutMs: number,
    token: vscode.CancellationToken
  ): Promise<string> {
    const sessionId = await this.getCompletionSession(token);
    const response = await this.request<unknown>(
      `/session/${encodeURIComponent(sessionId)}/message`,
      {
        method: "POST",
        body: JSON.stringify({
          parts: [
            {
              type: "text",
              text: prompt
            }
          ],
          model: undefined,
          providerID: undefined
        })
      },
      timeoutMs,
      token
    );

    return collectText(response);
  }

  public async chat(
    prompt: string,
    timeoutMs: number,
    token: vscode.CancellationToken,
    model?: string
  ): Promise<string> {
    const sessionId = await this.getChatSession(token);
    return this.sendMessage(sessionId, prompt, timeoutMs, token, model);
  }

  public async sendMessage(
    sessionId: string,
    text: string,
    timeoutMs: number,
    token: vscode.CancellationToken,
    model?: string
  ): Promise<string> {
    const body = {
      parts: [
        {
          type: "text",
          text
        }
      ],
      ...(model ? { model } : {})
    };

    const response = await this.request<unknown>(
      `/session/${encodeURIComponent(sessionId)}/message`,
      {
        method: "POST",
        body: JSON.stringify(body)
      },
      timeoutMs,
      token
    );

    return collectText(response);
  }

  public async createSession(
    title: string,
    token: vscode.CancellationToken
  ): Promise<string> {
    const response = await this.request<OpenCodeSession | { data: OpenCodeSession }>(
      "/session",
      {
        method: "POST",
        body: JSON.stringify({
          title
        })
      },
      5000,
      token
    );

    const session = "data" in response ? response.data : response;
    return session.id;
  }

  public dispose(): void {
    if (this.childProcess && !this.childProcess.killed) {
      this.childProcess.kill();
    }
  }

  private async getCompletionSession(
    token: vscode.CancellationToken
  ): Promise<string> {
    if (this.completionSessionId) {
      return this.completionSessionId;
    }

    this.completionSessionId = await this.createSession(
      "VS Code Inline Completion",
      token
    );
    return this.completionSessionId;
  }

  private async getChatSession(token: vscode.CancellationToken): Promise<string> {
    if (this.chatSessionId) {
      return this.chatSessionId;
    }

    this.chatSessionId = await this.createSession("VS Code Chat", token);
    return this.chatSessionId;
  }

  private async tryHealth(): Promise<boolean> {
    try {
      await this.health();
      return true;
    } catch {
      return false;
    }
  }

  private startServer(workspacePath: string): void {
    if (this.childProcess) {
      return;
    }

    this.startupError = undefined;

    const opencodePath = vscode.workspace
      .getConfiguration("opencodeVscode")
      .get<string>("opencodePath", "opencode");
    const url = new URL(this.serverUrl);
    const args = [
      "serve",
      "--hostname",
      url.hostname,
      "--port",
      url.port || "4096"
    ];

    this.output.appendLine(`Starting OpenCode server: ${opencodePath} ${args.join(" ")}`);
    const stderr: string[] = [];
    this.childProcess = spawn(opencodePath, args, {
      cwd: workspacePath,
      shell: process.platform === "win32"
    });

    this.childProcess.stdout.on("data", (data: Buffer) => {
      this.output.append(data.toString());
    });
    this.childProcess.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr.push(text);
      this.output.append(text);
    });
    this.childProcess.on("error", (error) => {
      this.startupError = new Error(
        `Failed to start OpenCode CLI '${opencodePath}'. Install OpenCode, set opencodeVscode.opencodePath, or configure opencodeVscode.serverUrl. ${error.message}`
      );
      this.output.appendLine(this.startupError.message);
    });
    this.childProcess.on("exit", (code, signal) => {
      this.output.appendLine(
        `OpenCode server process exited with code ${code ?? "unknown"} signal ${signal ?? "unknown"}.`
      );
      if (code !== 0 && !this.startupError) {
        const details = stderr.join("").trim();
        this.startupError = new Error(
          `OpenCode CLI '${opencodePath}' exited before the server became reachable. Install OpenCode, set opencodeVscode.opencodePath, or configure opencodeVscode.serverUrl.${details ? ` Output: ${details}` : ""}`
        );
      }
      this.childProcess = undefined;
    });
  }

  private async waitForHealth(): Promise<void> {
    const deadline = Date.now() + 30000;
    let lastError: unknown;

    while (Date.now() < deadline) {
      if (this.startupError) {
        throw this.startupError;
      }

      try {
        await this.health();
        return;
      } catch (error) {
        lastError = error;
        await delay(500);
      }
    }

    throw new Error(
      `OpenCode server did not become healthy at ${this.serverUrl}: ${String(lastError)}`
    );
  }

  private get serverUrl(): string {
    return (
      vscode.workspace
        .getConfiguration("opencodeVscode")
        .get<string | null>("serverUrl", null) ?? DEFAULT_SERVER_URL
    ).replace(/\/$/, "");
  }

  private hasExplicitServerUrl(): boolean {
    return Boolean(
      vscode.workspace
        .getConfiguration("opencodeVscode")
        .get<string | null>("serverUrl", null)
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    timeoutMs: number,
    token?: vscode.CancellationToken
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const disposable = token?.onCancellationRequested(() => controller.abort());

    try {
      const requestUrl = `${this.serverUrl}${path}`;
      let response: Response;
      try {
        response = await fetch(requestUrl, {
          ...init,
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            ...this.authHeader(),
            ...(init.headers ?? {})
          }
        });
      } catch (error) {
        throw new Error(
          `Cannot connect to OpenCode server at ${this.serverUrl}. Make sure OpenCode is installed and available as 'opencode', or set opencodeVscode.opencodePath/opencodeVscode.serverUrl. ${formatError(error)}`
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
      disposable?.dispose();
    }
  }

  private authHeader(): Record<string, string> {
    const config = vscode.workspace.getConfiguration("opencodeVscode");
    const password =
      config.get<string>("serverPassword", "") ||
      process.env.OPENCODE_SERVER_PASSWORD ||
      "";

    if (!password) {
      return {};
    }

    const username =
      config.get<string>("serverUsername", "opencode") ||
      process.env.OPENCODE_SERVER_USERNAME ||
      "opencode";
    return {
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
    };
  }
}

function collectText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(collectText).filter(Boolean).join("\n");
  }

  if (typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") {
    return record.text;
  }

  if (Array.isArray(record.parts)) {
    return record.parts
      .map((part) => collectPartText(part as OpenCodePart))
      .filter(Boolean)
      .join("\n");
  }

  if (record.data) {
    return collectText(record.data);
  }

  if (record.message) {
    return collectText(record.message);
  }

  return "";
}

function collectPartText(part: OpenCodePart): string {
  if (part.type === "text" && typeof part.text === "string") {
    return part.text;
  }
  return "";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
