import * as vscode from "vscode";
import { buildOpenCodeChatPrompt, estimateTextTokens, OPENCODE_MODEL_ID, OPENCODE_MODEL_SETTING_VALUE, OPENCODE_MODEL_VENDOR } from "./chatSerialization";

export {
  OPENCODE_MODEL_ID,
  OPENCODE_MODEL_SETTING_VALUE,
  OPENCODE_MODEL_VENDOR
};

export function activeWorkspacePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
  }

  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function languageModelMessagesToPrompt(
  messages: readonly vscode.LanguageModelChatRequestMessage[]
): string {
  return buildOpenCodeChatPrompt(
    messages.map((message) => ({
      role: roleName(message.role),
      text: partsToText(message.content)
    }))
  );
}

export function participantPrompt(prompt: string): string {
  return buildOpenCodeChatPrompt([
    {
      role: "user",
      text: prompt
    }
  ]);
}

export function estimateTokenCount(value: string | vscode.LanguageModelChatRequestMessage): number {
  const text =
    typeof value === "string" ? value : partsToText(value.content);
  return estimateTextTokens(text);
}

function partsToText(parts: ReadonlyArray<vscode.LanguageModelInputPart | unknown>): string {
  return parts
    .map((part) => {
      if (part instanceof vscode.LanguageModelTextPart) {
        return part.value;
      }

      if (
        typeof part === "object" &&
        part !== null &&
        "value" in part &&
        typeof (part as { value?: unknown }).value === "string"
      ) {
        return (part as { value: string }).value;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function roleName(role: vscode.LanguageModelChatMessageRole): "user" | "assistant" {
  switch (role) {
    case vscode.LanguageModelChatMessageRole.Assistant:
      return "assistant";
    case vscode.LanguageModelChatMessageRole.User:
    default:
      return "user";
  }
}
