import * as vscode from "vscode";
import { activeWorkspacePath, participantPrompt } from "./chatText";
import { OpenCodeClient } from "./opencodeClient";

export function createOpenCodeChatParticipant(
  client: OpenCodeClient,
  output: vscode.OutputChannel
): vscode.ChatParticipant {
  const participant = vscode.chat.createChatParticipant(
    "opencode.chat",
    async (request, _context, response, token) => {
      const workspacePath = activeWorkspacePath();
      if (!workspacePath) {
        response.markdown("OpenCode needs an open workspace to answer chat requests.");
        return;
      }

      try {
        response.progress("Sending request to OpenCode...");
        output.appendLine("OpenCode chat participant handling VS Code Chat request.");
        await client.ensureReady(workspacePath);
        const answer = await client.chat(participantPrompt(request.prompt), 60000, token);
        response.markdown(answer || "OpenCode returned an empty response.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`OpenCode chat participant failed: ${message}`);
        response.markdown(
          `OpenCode could not answer this request.\n\n${message}`
        );
      }
    }
  );

  return participant;
}
