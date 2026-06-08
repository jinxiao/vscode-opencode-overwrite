import assert from "node:assert/strict";
import test from "node:test";
import { parseSlashCommandInput } from "../commandParsing";

test("parseSlashCommandInput ignores normal chat text", () => {
  assert.equal(parseSlashCommandInput("who are you"), undefined);
});

test("parseSlashCommandInput parses command without arguments", () => {
  assert.deepEqual(parseSlashCommandInput("/help"), {
    command: "help",
    argumentsText: ""
  });
});

test("parseSlashCommandInput parses command arguments", () => {
  assert.deepEqual(parseSlashCommandInput("/init TypeScript project"), {
    command: "init",
    argumentsText: "TypeScript project"
  });
});
