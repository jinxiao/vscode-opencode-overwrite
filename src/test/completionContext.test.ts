import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompletionPrompt,
  extractInlineCompletion,
  trimMiddle
} from "../completionContext";

test("buildCompletionPrompt includes workspace session summaries", () => {
  const prompt = buildCompletionPrompt({
    languageId: "typescript",
    filePath: "D:\\repo\\src\\index.ts",
    workspacePath: "D:\\repo",
    line: 4,
    character: 10,
    before: "const value = ",
    after: "\nconsole.log(value);",
    sessionSummaries: [
      {
        id: "ses_1",
        title: "Refactor API client",
        updated: 1,
        excerpt: "assistant: Use the local OpenCode server."
      }
    ]
  });

  assert.match(prompt, /Refactor API client/);
  assert.match(prompt, /Return only the exact code\/text/);
  assert.match(prompt, /D:\\repo\\src\\index.ts/);
});

test("extractInlineCompletion removes markdown fences", () => {
  assert.equal(
    extractInlineCompletion("```ts\nreturn value;\n```", ""),
    "return value;"
  );
});

test("extractInlineCompletion avoids duplicating current line prefix", () => {
  assert.equal(
    extractInlineCompletion("const answer = 42", "const ans"),
    "wer = 42"
  );
});

test("trimMiddle keeps short values unchanged and trims long values", () => {
  assert.equal(trimMiddle("short", 10), "short");
  assert.match(trimMiddle("abcdefghijklmnopqrstuvwxyz", 20), /\.\.\.\[trimmed\]\.\.\./);
});
