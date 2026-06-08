export interface ParsedSlashCommand {
  command: string;
  argumentsText: string;
}

export function parseSlashCommandInput(value: string): ParsedSlashCommand | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return undefined;
  }

  const withoutSlash = trimmed.slice(1);
  const firstSpace = withoutSlash.search(/\s/);
  if (firstSpace === -1) {
    return {
      command: withoutSlash,
      argumentsText: ""
    };
  }

  return {
    command: withoutSlash.slice(0, firstSpace),
    argumentsText: withoutSlash.slice(firstSpace).trim()
  };
}
