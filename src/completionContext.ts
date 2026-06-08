import { CompletionContext } from "./types";

export function buildCompletionPrompt(context: CompletionContext): string {
  const sessionBlock = context.sessionSummaries.length
    ? context.sessionSummaries
        .map((session) => `- ${session.title}: ${session.excerpt}`)
        .join("\n")
    : "- No relevant OpenCode session history found for this workspace.";

  return [
    "You are OpenCode running as a VS Code inline completion engine.",
    "Return only the exact code/text that should be inserted at the cursor.",
    "Do not include markdown fences, explanations, comments about your answer, or duplicated existing code.",
    "If no useful completion is available, return an empty response.",
    "",
    `Workspace: ${context.workspacePath}`,
    `File: ${context.filePath}`,
    `Language: ${context.languageId}`,
    `Cursor: line ${context.line + 1}, character ${context.character + 1}`,
    "",
    "Relevant OpenCode sessions:",
    sessionBlock,
    "",
    "Text before cursor:",
    "<before>",
    context.before,
    "</before>",
    "",
    "Text after cursor:",
    "<after>",
    context.after,
    "</after>"
  ].join("\n");
}

export function extractInlineCompletion(raw: string, prefix: string): string {
  let text = raw.trimEnd();

  text = text.replace(/^```[a-zA-Z0-9_-]*\s*/, "").replace(/\s*```$/, "");
  text = text.replace(/^Here(?:'s| is).*?:\s*/i, "");

  if (!text.trim()) {
    return "";
  }

  const currentLinePrefix = prefix.slice(prefix.lastIndexOf("\n") + 1);
  if (currentLinePrefix && text.startsWith(currentLinePrefix)) {
    text = text.slice(currentLinePrefix.length);
  }

  return text;
}

export function trimMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const half = Math.floor((maxLength - 15) / 2);
  return `${value.slice(0, half)}\n...[trimmed]...\n${value.slice(-half)}`;
}
