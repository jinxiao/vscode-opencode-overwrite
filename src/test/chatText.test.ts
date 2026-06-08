import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpenCodeChatPrompt,
  estimateTextTokens
} from "../chatSerialization";

test("buildOpenCodeChatPrompt renders chat turns without model names", () => {
  const prompt = buildOpenCodeChatPrompt([
    {
      role: "user",
      text: "who r u"
    }
  ]);

  assert.match(prompt, /OpenCode/);
  assert.match(prompt, /user: who r u/);
  assert.doesNotMatch(prompt, /Gemini/i);
  assert.doesNotMatch(prompt, /Claude/i);
});

test("buildOpenCodeChatPrompt routes direct chat text to OpenCode", () => {
  const prompt = buildOpenCodeChatPrompt([
    {
      role: "user",
      text: "explain this repo"
    }
  ]);

  assert.match(prompt, /OpenCode/);
  assert.match(prompt, /user: explain this repo/);
});

test("estimateTextTokens returns a positive conservative value", () => {
  assert.equal(estimateTextTokens(""), 1);
  assert.equal(estimateTextTokens("12345678"), 2);
});
