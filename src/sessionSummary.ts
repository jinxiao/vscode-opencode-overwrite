import { OpenCodeMessage } from "./types";

export function summarizeSessionMessages(messages: readonly OpenCodeMessage[]): string {
  const text = messages
    .slice(-4)
    .map((message) => {
      const role = message.info.role;
      const content = message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .filter(Boolean)
        .join(" ");
      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean)
    .join(" ");

  return trimText(text || "No messages yet", 120);
}

export function formatRelativeTime(timestamp: number): string {
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) {
    return "just now";
  }
  if (elapsed < hour) {
    return `${Math.floor(elapsed / minute)}m ago`;
  }
  if (elapsed < day) {
    return `${Math.floor(elapsed / hour)}h ago`;
  }
  return `${Math.floor(elapsed / day)}d ago`;
}

function trimText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`
    : normalized;
}
