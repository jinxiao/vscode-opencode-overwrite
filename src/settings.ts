import * as vscode from "vscode";
import { FALLBACK_OPENCODE_MODEL, opencodeModelSettingValue } from "./openCodeModels";

type BackupValue = {
  key: string;
  hadWorkspaceValue: boolean;
  value: unknown;
};

const BACKUP_KEY = "opencode.copilotWorkspaceSettingsBackup";

const MANAGED_SETTINGS: BackupValue["key"][] = [
  "github.copilot.enable",
  "github.copilot.nextEditSuggestions.enabled",
  "editor.inlineSuggest.enabled"
];

export class SettingsManager {
  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel
  ) {}

  public isEnabled(): boolean {
    return vscode.workspace
      .getConfiguration("opencodeVscode")
      .get<boolean>("enabled", true);
  }

  public shouldDisableCopilotOnActivation(): boolean {
    return vscode.workspace
      .getConfiguration("opencodeVscode")
      .get<boolean>("disableCopilotOnActivation", true);
  }

  public async replaceCopilotCompletions(): Promise<void> {
    await this.backupWorkspaceSettings();

    await vscode.workspace
      .getConfiguration()
      .update(
        "github.copilot.enable",
        { "*": false },
        vscode.ConfigurationTarget.Workspace
      );
    await vscode.workspace
      .getConfiguration()
      .update(
        "github.copilot.nextEditSuggestions.enabled",
        false,
        vscode.ConfigurationTarget.Workspace
      );
    await vscode.workspace
      .getConfiguration()
      .update(
        "editor.inlineSuggest.enabled",
        true,
        vscode.ConfigurationTarget.Workspace
      );

    this.output.appendLine(
      "Workspace Copilot inline settings replaced with OpenCode inline completions."
    );
  }

  public async preferOpenCodeChatModels(modelId = FALLBACK_OPENCODE_MODEL.id): Promise<void> {
    const target = vscode.ConfigurationTarget.Global;
    const config = vscode.workspace.getConfiguration();
    const modelSettingValue = opencodeModelSettingValue(modelId);

    await this.updateIfAvailable(config, "chat.defaultModel", modelSettingValue, target);
    await this.updateIfAvailable(config, "inlineChat.defaultModel", modelSettingValue, target);
    await this.updateIfAvailable(config, "chat.utilityModel", modelSettingValue, target);
    await this.updateIfAvailable(config, "chat.utilitySmallModel", modelSettingValue, target);
  }

  public async restoreCopilotSettings(): Promise<void> {
    const backup =
      this.context.globalState.get<BackupValue[]>(BACKUP_KEY) ?? [];

    if (!backup.length) {
      vscode.window.showInformationMessage(
        "OpenCode has no saved Copilot workspace settings to restore."
      );
      return;
    }

    for (const item of backup) {
      await vscode.workspace
        .getConfiguration()
        .update(
          item.key,
          item.hadWorkspaceValue ? item.value : undefined,
          vscode.ConfigurationTarget.Workspace
        );
    }

    await this.context.globalState.update(BACKUP_KEY, undefined);
    this.output.appendLine("Restored Copilot workspace settings.");
    vscode.window.showInformationMessage(
      "OpenCode restored the saved Copilot workspace settings."
    );
  }

  private async backupWorkspaceSettings(): Promise<void> {
    const existing = this.context.globalState.get<BackupValue[]>(BACKUP_KEY);
    if (existing?.length) {
      return;
    }

    const backup = MANAGED_SETTINGS.map((key) => {
      const inspection = vscode.workspace.getConfiguration().inspect(key);
      return {
        key,
        hadWorkspaceValue:
          typeof inspection?.workspaceValue !== "undefined" ||
          typeof inspection?.workspaceFolderValue !== "undefined",
        value:
          typeof inspection?.workspaceFolderValue !== "undefined"
            ? inspection.workspaceFolderValue
            : inspection?.workspaceValue
      };
    });

    await this.context.globalState.update(BACKUP_KEY, backup);
  }

  private async updateIfAvailable(
    config: vscode.WorkspaceConfiguration,
    key: string,
    value: string,
    target: vscode.ConfigurationTarget
  ): Promise<void> {
    const inspected = config.inspect(key);
    if (!inspected) {
      this.output.appendLine(`VS Code setting '${key}' is not available in this build.`);
      return;
    }

    await config.update(key, value, target);
  }
}
