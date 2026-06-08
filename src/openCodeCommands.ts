import { OpenCodeCommand } from "./types";

export function normalizeCommands(value: unknown): OpenCodeCommand[] {
  return readItems(value).flatMap((item) => {
    const id = readString(item.id) ?? readString(item.name) ?? readString(item.command);
    if (!id) {
      return [];
    }
    const normalized = id.startsWith("/") ? id.slice(1) : id;
    return [
      {
        id: normalized,
        name: readString(item.name) ?? `/${normalized}`,
        description: readString(item.description),
        agent: readString(item.agent)
      }
    ];
  });
}

function readItems(value: unknown): Record<string, unknown>[] {
  const unwrapped = unwrapUnknown(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped.filter(isRecord);
  }
  if (!isRecord(unwrapped)) {
    return [];
  }

  const candidate =
    unwrapped.commands ??
    unwrapped.command ??
    unwrapped.all ??
    unwrapped.items ??
    unwrapped;

  if (Array.isArray(candidate)) {
    return candidate.filter(isRecord);
  }
  if (!isRecord(candidate)) {
    return [];
  }
  return Object.entries(candidate).flatMap(([key, item]) => {
    if (!isRecord(item)) {
      return [];
    }
    return [{ id: key, ...item }];
  });
}

function unwrapUnknown(value: unknown): unknown {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
