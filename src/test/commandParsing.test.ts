import assert from "node:assert/strict";
import test from "node:test";
import { parseSlashCommandInput } from "../commandParsing";
import { parseFileMentions } from "../fileMentions";

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

test("parseFileMentions extracts one or more @file references", () => {
  assert.deepEqual(parseFileMentions("read @src/index.ts and @package.json"), [
    "src/index.ts",
    "package.json"
  ]);
});
