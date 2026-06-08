export const OPENCODE_MODEL_VENDOR = "opencode";
export const OPENCODE_MODEL_ID = "opencode";
export const OPENCODE_MODEL_SETTING_VALUE = "opencode/opencode";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export function buildOpenCodeChatPrompt(turns: ChatTurn[]): string {
  const rendered = turns
    .map((turn) => (turn.text ? `${turn.role}: ${turn.text}` : ""))
    .filter(Boolean)
    .join("\n\n");

  return [
    "You are OpenCode running inside VS Code Chat.",
    "Answer the user directly and concisely. Use markdown when useful.",
    "",
    rendered
  ].join("\n");
}

export function estimateTextTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
