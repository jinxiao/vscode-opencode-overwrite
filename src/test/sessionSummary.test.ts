import assert from "node:assert/strict";
import test from "node:test";
import { summarizeSessionMessages } from "../sessionSummary";
import { OpenCodeMessage } from "../types";

test("summarizeSessionMessages renders a compact recent summary", () => {
  const messages: OpenCodeMessage[] = [
    {
      info: { role: "user" },
      parts: [{ type: "text", text: "Build a VS Code sidebar" }]
    },
    {
      info: { role: "assistant" },
      parts: [{ type: "text", text: "Implemented the OpenCode agent view" }]
    }
  ];

  const summary = summarizeSessionMessages(messages);
  assert.match(summary, /user: Build a VS Code sidebar/);
  assert.match(summary, /assistant: Implemented/);
});

test("summarizeSessionMessages handles empty sessions", () => {
  assert.equal(summarizeSessionMessages([]), "No messages yet");
});
