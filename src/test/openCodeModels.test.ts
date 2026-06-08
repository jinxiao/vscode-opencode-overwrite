import assert from "node:assert/strict";
import test from "node:test";
import {
  FALLBACK_OPENCODE_MODEL,
  normalizeOpenCodeModels,
  opencodeModelSettingValue
} from "../openCodeModels";

test("normalizeOpenCodeModels reads config provider model maps", () => {
  const models = normalizeOpenCodeModels({
    default: {
      providerID: "anthropic",
      modelID: "claude-sonnet-4"
    },
    providers: {
      anthropic: {
        name: "Anthropic",
        models: {
          "claude-opus-4": {
            name: "Claude Opus 4",
            limit: {
              context: 200000,
              output: 32000
            },
            tool_call: true
          },
          "claude-sonnet-4": {
            name: "Claude Sonnet 4",
            limit: {
              context: 200000,
              output: 64000
            }
          }
        }
      }
    }
  });

  assert.equal(models.length, 2);
  assert.equal(models[0].id, "anthropic/claude-sonnet-4");
  assert.equal(models[0].name, "Claude Sonnet 4");
  assert.equal(models[0].maxOutputTokens, 64000);
  assert.equal(models[1].id, "anthropic/claude-opus-4");
});

test("normalizeOpenCodeModels reads provider arrays and avoids external labels", () => {
  const models = normalizeOpenCodeModels(undefined, {
    data: {
      providers: [
        {
          id: "openai",
          name: "OpenAI",
          models: [
            {
              id: "gpt-5.1",
              name: "GPT-5.1",
              toolCalling: false,
              maxInputTokens: 128000,
              maxOutputTokens: 16000
            }
          ]
        }
      ]
    }
  });

  assert.equal(models.length, 1);
  assert.equal(models[0].id, "openai/gpt-5.1");
  assert.equal(models[0].supportsTools, false);
  assert.doesNotMatch(models[0].name, /Gemini/i);
  assert.doesNotMatch(models[0].name, /Claude/i);
});

test("normalizeOpenCodeModels falls back when OpenCode exposes no models", () => {
  assert.deepEqual(normalizeOpenCodeModels({ providers: {} }), [FALLBACK_OPENCODE_MODEL]);
  assert.equal(opencodeModelSettingValue("anthropic/claude-sonnet-4"), "opencode/anthropic/claude-sonnet-4");
});

test("normalizeOpenCodeModels prefers default provider model maps", () => {
  const models = normalizeOpenCodeModels({
    default: {
      openai: "gpt-5.1"
    },
    providers: [
      {
        id: "anthropic",
        models: {
          "claude-sonnet-4": {}
        }
      },
      {
        id: "openai",
        models: {
          "gpt-5.1": {}
        }
      }
    ]
  });

  assert.equal(models[0].id, "openai/gpt-5.1");
});
