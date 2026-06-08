import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { AgentViewState, ExtensionMessage, OpenCodeCommand } from "./types";
import { vscode } from "./vscode";

const emptyState: AgentViewState = {
  connected: false,
  serverUrl: "",
  status: "Loading",
  mode: "chat",
  sessions: [],
  messages: [],
  models: [],
  agents: [],
  commands: [],
  context: []
};

function App(): React.JSX.Element {
  const [state, setState] = useState<AgentViewState>(emptyState);
  const [busy, setBusy] = useState<string | undefined>("Loading OpenCode...");
  const [error, setError] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [commandId, setCommandId] = useState("");

  useEffect(() => {
    const listener = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      if (message.type === "state") {
        setState(message.state);
        setError(undefined);
      } else if (message.type === "busy") {
        setBusy(message.value ? message.message ?? "Working..." : undefined);
      } else if (message.type === "error") {
        setError(message.message);
      }
    };
    window.addEventListener("message", listener);
    vscode?.postMessage({ type: "initialize" });
    return () => window.removeEventListener("message", listener);
  }, []);

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.id === state.activeSessionId),
    [state.activeSessionId, state.sessions]
  );

  const send = () => {
    const text = input.trim();
    if (!text || busy) {
      return;
    }
    setInput("");
    vscode?.postMessage({ type: "sendMessage", text });
  };

  const runSelectedCommand = () => {
    const command = state.commands.find((item) => item.id === commandId);
    if (!command) {
      return;
    }
    vscode?.postMessage({
      type: "runCommand",
      command: command.id,
      argumentsText: input.startsWith("/") ? "" : input.trim()
    });
    setInput("");
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>OpenCode</h1>
          <p>{state.status}</p>
        </div>
        <button title="Refresh" onClick={() => vscode?.postMessage({ type: "refresh" })}>
          Refresh
        </button>
      </header>

      {error ? <div className="notice error">{error}</div> : null}
      {busy ? <div className="notice">{busy}</div> : null}

      <section className="controls">
        <label>
          Session
          <select
            value={state.activeSessionId ?? ""}
            onChange={(event) =>
              vscode?.postMessage({ type: "selectSession", sessionId: event.target.value })
            }
          >
            {state.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => vscode?.postMessage({ type: "createSession" })}>
          New
        </button>
      </section>

      <section className="controls compact">
        <div className="segments" role="tablist" aria-label="Mode">
          <button
            className={state.mode === "chat" ? "active" : ""}
            onClick={() => vscode?.postMessage({ type: "setMode", mode: "chat" })}
          >
            Chat
          </button>
          <button
            className={state.mode === "agent" ? "active" : ""}
            onClick={() => vscode?.postMessage({ type: "setMode", mode: "agent" })}
          >
            Agent
          </button>
        </div>
        <label>
          Model
          <select
            value={state.selectedModelId ?? ""}
            onChange={(event) =>
              vscode?.postMessage({ type: "selectModel", modelId: event.target.value })
            }
          >
            {state.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="meta">
        <div>{activeSession?.id ?? "No session"}</div>
        <div>{state.workspacePath ?? "No workspace"}</div>
      </section>

      <section className="context">
        <div className="sectionTitle">
          <span>Context</span>
          <button onClick={() => vscode?.postMessage({ type: "clearContext" })}>
            Clear
          </button>
        </div>
        {state.context.length ? (
          <div className="chips">
            {state.context.map((item) => (
              <span key={item.id} title={item.path}>
                {item.label}{item.truncated ? " *" : ""}
              </span>
            ))}
          </div>
        ) : (
          <p className="empty">Add files from the editor or Explorer context menu.</p>
        )}
      </section>

      <section className="messages">
        {state.messages.length ? (
          state.messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="role">{message.role}</div>
              <pre>{message.text}</pre>
            </article>
          ))
        ) : (
          <div className="empty center">Start a conversation with OpenCode.</div>
        )}
      </section>

      <section className="composer">
        <div className="commandRow">
          <select value={commandId} onChange={(event) => setCommandId(event.target.value)}>
            <option value="">Slash command...</option>
            {state.commands.map((command: OpenCodeCommand) => (
              <option key={command.id} value={command.id}>
                {command.name.startsWith("/") ? command.name : `/${command.id}`}
              </option>
            ))}
          </select>
          <button disabled={!commandId || Boolean(busy)} onClick={runSelectedCommand}>
            Run
          </button>
        </div>
        <textarea
          value={input}
          rows={4}
          placeholder="Ask OpenCode, or type /help"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              send();
            }
          }}
        />
        <button disabled={!input.trim() || Boolean(busy)} onClick={send}>
          Send
        </button>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
