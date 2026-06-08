import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCommands } from "../openCodeCommands";

test("normalizeCommands preserves custom command ids from object maps", () => {
  const commands = normalizeCommands({
    data: {
      commands: {
        init: { description: "Initialize project" },
        "my/custom": { name: "/my/custom", description: "Custom command" }
      }
    }
  });

  assert.deepEqual(
    commands.map((command) => command.id),
    ["init", "my/custom"]
  );
  assert.equal(commands[1].name, "/my/custom");
});

test("normalizeCommands reads command arrays", () => {
  const commands = normalizeCommands([
    { id: "/help", description: "Show help", agent: "plan" },
    { command: "undo", description: "Undo last change" }
  ]);

  assert.equal(commands[0].id, "help");
  assert.equal(commands[0].agent, "plan");
  assert.deepEqual(commands[0].hints, []);
  assert.equal(commands[1].id, "undo");
});

test("normalizeCommands preserves OpenCode command metadata", () => {
  const commands = normalizeCommands({
    location: { directory: "D:/workspace" },
    data: [
      {
        name: "review",
        description: "review changes [commit|branch|pr], defaults to uncommitted",
        agent: "plan",
        model: "anthropic/claude-sonnet-4",
        source: "command",
        subtask: true,
        hints: ["$ARGUMENTS"]
      },
      {
        name: "server-prompt",
        source: "mcp",
        hints: ["$1", "$2"]
      },
      {
        name: "repo-skill",
        source: "skill"
      }
    ]
  });

  assert.deepEqual(
    commands.map((command) => command.id),
    ["review", "server-prompt", "repo-skill"]
  );
  assert.equal(commands[0].source, "command");
  assert.equal(commands[0].agent, "plan");
  assert.equal(commands[0].model, "anthropic/claude-sonnet-4");
  assert.equal(commands[0].subtask, true);
  assert.deepEqual(commands[0].hints, ["$ARGUMENTS"]);
  assert.equal(commands[1].source, "mcp");
  assert.deepEqual(commands[1].hints, ["$1", "$2"]);
  assert.equal(commands[2].source, "skill");
  assert.deepEqual(commands[2].hints, []);
});
