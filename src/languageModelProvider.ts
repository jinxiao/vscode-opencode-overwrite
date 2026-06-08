import * as vscode from "vscode";
import { activeWorkspacePath, estimateTokenCount, languageModelMessagesToPrompt, OPENCODE_MODEL_ID } from "./chatText";
import { OpenCodeClient } from "./opencodeClient";

const OPENCODE_MODEL: vscode.LanguageModelChatInformation = {
  id: OPENCODE_MODEL_ID,
  name: "OpenCode",
  family: "opencode",
  tooltip: "OpenCode local server model",
  detail: "Routes VS Code Chat requests to OpenCode",
  version: "1",
  maxInputTokens: 128000,
  maxOutputTokens: 32000,
  capabilities: {
    toolCalling: true
  }
};

export class OpenCodeLanguageModelProvider implements vscode.LanguageModelChatProvider {
  public constructor(
    private readonly client: OpenCodeClient,
    private readonly output: vscode.OutputChannel
  ) {}

  public provideLanguageModelChatInformation(): vscode.ProviderResult<vscode.LanguageModelChatInformation[]> {
    return [OPENCODE_MODEL];
  }

  public async provideLanguageModelChatResponse(
    _model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    _options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken
  ): Promise<void> {
    const workspacePath = activeWorkspacePath();
    if (!workspacePath) {
      throw new Error("OpenCode needs an open workspace to answer VS Code Chat requests.");
    }

    this.output.appendLine("OpenCode language model provider handling VS Code Chat request.");
    await this.client.ensureReady(workspacePath);
    const prompt = languageModelMessagesToPrompt(messages);
    const text = await this.client.chat(prompt, 60000, token);
    progress.report(new vscode.LanguageModelTextPart(text || "OpenCode returned an empty response."));
  }

  public async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    text: string | vscode.LanguageModelChatRequestMessage
  ): Promise<number> {
    return estimateTokenCount(text);
  }
}
