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
  assert.equal(commands[1].id, "undo");
});
