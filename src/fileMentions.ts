export function parseFileMentions(text: string): string[] {
  const matches = text.matchAll(/(^|\s)@([^\s]+)/g);
  return Array.from(matches)
    .map((match) => match[2])
    .filter((value) => value && !value.startsWith("/"));
}
