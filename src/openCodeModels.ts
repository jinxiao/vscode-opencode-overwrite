export const OPENCODE_MODEL_VENDOR = "opencode";

export interface OpenCodeModelInfo {
  id: string;
  providerID: string;
  modelID: string;
  name: string;
  providerName?: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  isFallback?: boolean;
}

export const FALLBACK_OPENCODE_MODEL: OpenCodeModelInfo = {
  id: "opencode/default",
  providerID: "opencode",
  modelID: "default",
  name: "OpenCode Default",
  providerName: "OpenCode",
  maxInputTokens: 128000,
  maxOutputTokens: 32000,
  supportsTools: true,
  isFallback: true
};

export function opencodeModelSettingValue(modelId?: string): string {
  return `${OPENCODE_MODEL_VENDOR}/${modelId || FALLBACK_OPENCODE_MODEL.id}`;
}

export function normalizeOpenCodeModels(
  configProvidersResponse: unknown,
  providerResponse?: unknown
): OpenCodeModelInfo[] {
  const models = new Map<string, OpenCodeModelInfo>();
  const defaults = new Set([
    ...readDefaultModelIds(configProvidersResponse),
    ...readDefaultModelIds(providerResponse)
  ]);

  for (const provider of readProviders(configProvidersResponse)) {
    addProviderModels(models, provider);
  }

  for (const provider of readProviders(providerResponse)) {
    addProviderModels(models, provider);
  }

  const sorted = Array.from(models.values()).sort((left, right) => {
    const leftDefault = defaults.has(left.id);
    const rightDefault = defaults.has(right.id);
    if (leftDefault !== rightDefault) {
      return leftDefault ? -1 : 1;
    }
    return `${left.providerName ?? left.providerID} ${left.name}`.localeCompare(
      `${right.providerName ?? right.providerID} ${right.name}`
    );
  });

  return sorted.length ? sorted : [FALLBACK_OPENCODE_MODEL];
}

function addProviderModels(
  models: Map<string, OpenCodeModelInfo>,
  provider: ProviderCandidate
): void {
  const modelCandidates = readModelCandidates(provider.value);
  for (const candidate of modelCandidates) {
    const model = toOpenCodeModel(provider, candidate);
    if (model && !models.has(model.id)) {
      models.set(model.id, model);
    }
  }
}

interface ProviderCandidate {
  id: string;
  name?: string;
  value: Record<string, unknown>;
}

interface ModelCandidate {
  id: string;
  value: Record<string, unknown>;
}

function readProviders(value: unknown): ProviderCandidate[] {
  const root = unwrapData(value);
  if (!isRecord(root)) {
    return [];
  }
  const rootConfig = isRecord(root.config) ? root.config : undefined;

  const candidates = [
    root.providers,
    root.provider,
    root.all,
    root.connected,
    rootConfig?.providers
  ];

  const providers = candidates.flatMap((candidate) => readProviderCandidates(candidate));

  if (!providers.length && looksLikeProvider(root)) {
    return [
      {
        id: readString(root.id) ?? readString(root.providerID) ?? "opencode",
        name: readString(root.name),
        value: root
      }
    ];
  }

  return providers;
}

function readProviderCandidates(value: unknown): ProviderCandidate[] {
  const unwrapped = unwrapData(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }
      const id = readString(item.id) ?? readString(item.providerID);
      return id
        ? [
            {
              id,
              name: readString(item.name),
              value: item
            }
          ]
        : [];
    });
  }

  if (!isRecord(unwrapped)) {
    return [];
  }

  return Object.entries(unwrapped).flatMap(([key, item]) => {
    if (!isRecord(item)) {
      return [];
    }
    return [
      {
        id: readString(item.id) ?? readString(item.providerID) ?? key,
        name: readString(item.name),
        value: item
      }
    ];
  });
}

function readModelCandidates(provider: Record<string, unknown>): ModelCandidate[] {
  const options = isRecord(provider.options) ? provider.options : undefined;
  const config = isRecord(provider.config) ? provider.config : undefined;
  const candidates = [
    provider.models,
    provider.model,
    options?.models,
    config?.models
  ];

  return candidates.flatMap((candidate) => readModelCandidateList(candidate));
}

function readModelCandidateList(value: unknown): ModelCandidate[] {
  const unwrapped = unwrapData(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped.flatMap((item) => {
      if (typeof item === "string") {
        return [{ id: item, value: { id: item } }];
      }
      if (!isRecord(item)) {
        return [];
      }
      const id = readString(item.id) ?? readString(item.modelID) ?? readString(item.model);
      return id ? [{ id, value: item }] : [];
    });
  }

  if (!isRecord(unwrapped)) {
    return [];
  }

  return Object.entries(unwrapped).flatMap(([key, item]) => {
    if (typeof item === "string") {
      return [{ id: key, value: { id: key, name: item } }];
    }
    if (!isRecord(item)) {
      return [];
    }
    return [
      {
        id: readString(item.id) ?? readString(item.modelID) ?? readString(item.model) ?? key,
        value: item
      }
    ];
  });
}

function toOpenCodeModel(
  provider: ProviderCandidate,
  candidate: ModelCandidate
): OpenCodeModelInfo | undefined {
  const providerID =
    readString(candidate.value.providerID) ??
    readString(candidate.value.provider) ??
    provider.id;
  const modelID = candidate.id;
  if (!providerID || !modelID) {
    return undefined;
  }

  const limit = isRecord(candidate.value.limit) ? candidate.value.limit : undefined;
  const inputLimit =
    readNumber(candidate.value.contextLimit) ??
    readNumber(candidate.value.maxInputTokens) ??
    readNumber(candidate.value.inputTokens) ??
    readNumber(limit?.context) ??
    readNumber(limit?.input) ??
    FALLBACK_OPENCODE_MODEL.maxInputTokens;
  const outputLimit =
    readNumber(candidate.value.outputLimit) ??
    readNumber(candidate.value.maxOutputTokens) ??
    readNumber(candidate.value.outputTokens) ??
    readNumber(limit?.output) ??
    FALLBACK_OPENCODE_MODEL.maxOutputTokens;

  return {
    id: `${providerID}/${modelID}`,
    providerID,
    modelID,
    name: readString(candidate.value.name) ?? readString(candidate.value.label) ?? modelID,
    providerName: provider.name ?? providerID,
    maxInputTokens: inputLimit,
    maxOutputTokens: outputLimit,
    supportsTools:
      readBoolean(candidate.value.toolCalling) ??
      readBoolean(candidate.value.tool_call) ??
      readBoolean(candidate.value.tools) ??
      true
  };
}

function looksLikeProvider(value: Record<string, unknown>): boolean {
  return Boolean(value.models || value.model || value.id || value.providerID);
}

function readDefaultModelIds(value: unknown): string[] {
  const root = unwrapData(value);
  if (!isRecord(root)) {
    return [];
  }

  const defaults = [
    readDefaultModelId(root.default),
    ...readDefaultModelMapIds(root.default),
    readDefaultModelId(root.defaults),
    ...readDefaultModelMapIds(root.defaults),
    ...readProviderCandidates(root.providers).flatMap((provider) => {
      return [
        readDefaultModelId(provider.value.default, provider.id),
        readDefaultModelId(provider.value.defaultModel, provider.id),
        readDefaultModelId(provider.value.model, provider.id)
      ];
    })
  ];

  return defaults.filter((id): id is string => Boolean(id));
}

function readDefaultModelMapIds(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }

  if (value.providerID || value.provider || value.modelID || value.model || value.id) {
    return [];
  }

  return Object.entries(value).flatMap(([providerID, modelID]) => {
    return typeof modelID === "string" && modelID
      ? [`${providerID}/${modelID}`]
      : [];
  });
}

function readDefaultModelId(value: unknown, providerID?: string): string | undefined {
  if (typeof value === "string") {
    if (value.includes("/")) {
      return value;
    }
    return providerID ? `${providerID}/${value}` : undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const nested = readDefaultModelId(value.model, providerID) ?? readDefaultModelId(value.id, providerID);
  if (nested) {
    return nested;
  }

  const provider = readString(value.providerID) ?? readString(value.provider) ?? providerID;
  const model = readString(value.modelID) ?? readString(value.model) ?? readString(value.id);
  return provider && model ? `${provider}/${model}` : undefined;
}

function unwrapData(value: unknown): unknown {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
