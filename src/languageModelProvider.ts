import * as vscode from "vscode";
import {
  activeWorkspacePath,
  estimateTokenCount,
  languageModelMessagesToPrompt
} from "./chatText";
import { OpenCodeClient } from "./opencodeClient";
import {
  FALLBACK_OPENCODE_MODEL,
  OpenCodeModelInfo
} from "./openCodeModels";

export class OpenCodeLanguageModelProvider implements vscode.LanguageModelChatProvider {
  private readonly didChangeLanguageModelChatInformation =
    new vscode.EventEmitter<void>();
  private models = [toLanguageModelChatInformation(FALLBACK_OPENCODE_MODEL)];

  public readonly onDidChangeLanguageModelChatInformation =
    this.didChangeLanguageModelChatInformation.event;

  public constructor(
    private readonly client: OpenCodeClient,
    private readonly output: vscode.OutputChannel
  ) {}

  public async refreshModels(
    workspacePath = activeWorkspacePath(),
    token?: vscode.CancellationToken
  ): Promise<vscode.LanguageModelChatInformation[]> {
    if (!workspacePath) {
      this.models = [toLanguageModelChatInformation(FALLBACK_OPENCODE_MODEL)];
      this.didChangeLanguageModelChatInformation.fire();
      return this.models;
    }

    await this.client.ensureReady(workspacePath);
    const openCodeModels = await this.client.listProviderModels(token);
    this.models = openCodeModels.map(toLanguageModelChatInformation);
    this.didChangeLanguageModelChatInformation.fire();
    this.output.appendLine(
      `OpenCode language model provider loaded ${this.models.length} model(s): ${this.models
        .map((model) => model.id)
        .join(", ")}`
    );
    return this.models;
  }

  public async provideLanguageModelChatInformation(
    _options: vscode.PrepareLanguageModelChatModelOptions,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelChatInformation[]> {
    if (!this.models.length || this.models[0].id === FALLBACK_OPENCODE_MODEL.id) {
      try {
        return await this.refreshModels(activeWorkspacePath(), token);
      } catch (error) {
        this.output.appendLine(
          `OpenCode model discovery failed, using fallback model: ${String(error)}`
        );
      }
    }

    return this.models;
  }

  public async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    _options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken
  ): Promise<void> {
    const workspacePath = activeWorkspacePath();
    if (!workspacePath) {
      throw new Error("OpenCode needs an open workspace to answer VS Code Chat requests.");
    }

    this.output.appendLine(
      `OpenCode language model provider handling VS Code Chat request with model ${model.id}.`
    );
    await this.client.ensureReady(workspacePath);
    const prompt = languageModelMessagesToPrompt(messages);
    const text = await this.client.chat(prompt, 60000, token, model.id);
    progress.report(
      new vscode.LanguageModelTextPart(text || "OpenCode returned an empty response.")
    );
  }

  public async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    text: string | vscode.LanguageModelChatRequestMessage
  ): Promise<number> {
    return estimateTokenCount(text);
  }

  public dispose(): void {
    this.didChangeLanguageModelChatInformation.dispose();
  }
}

function toLanguageModelChatInformation(
  model: OpenCodeModelInfo
): vscode.LanguageModelChatInformation {
  return {
    id: model.id,
    name: model.name,
    family: model.providerID,
    tooltip: model.providerName
      ? `${model.providerName}: ${model.modelID}`
      : model.modelID,
    detail: model.providerName ?? model.providerID,
    version: "1",
    maxInputTokens: model.maxInputTokens,
    maxOutputTokens: model.maxOutputTokens,
    capabilities: {
      toolCalling: model.supportsTools
    }
  };
}
