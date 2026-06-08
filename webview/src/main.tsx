import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
  AgentMode,
  AgentViewState,
  ChatMessageView,
  ContextAttachment,
  ExtensionMessage,
  ModelView,
  OpenCodeCommand,
  SessionView
} from "./types";
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
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const slashQuery = parseSlashQuery(input);
  const filteredCommands = useMemo(() => {
    if (slashQuery === undefined) {
      return [];
    }
    return state.commands
      .filter((command) => command.id.toLowerCase().includes(slashQuery.toLowerCase()))
      .slice(0, 6);
  }, [slashQuery, state.commands]);

  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [slashQuery]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) {
      return;
    }
    setInput("");
    vscode?.postMessage({ type: "sendMessage", text });
  };

  const chooseCommand = (command: OpenCodeCommand, sendImmediately: boolean) => {
    const value = `/${command.id}`;
    if (sendImmediately) {
      setInput("");
      vscode?.postMessage({ type: "sendMessage", text: value });
      return;
    }
    setInput(`${value} `);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <main className="shell">
      <Header state={state} busy={busy} error={error} />
      <SessionList sessions={state.sessions} activeSessionId={state.activeSessionId} />
      <Toolbar mode={state.mode} models={state.models} selectedModelId={state.selectedModelId} />
      <ContextBar context={state.context} />
      <MessageList messages={state.messages} />
      <Composer
        input={input}
        busy={busy}
        inputRef={inputRef}
        commands={filteredCommands}
        selectedCommandIndex={selectedCommandIndex}
        onSelectedCommandIndexChange={setSelectedCommandIndex}
        onInputChange={setInput}
        onSend={send}
        onChooseCommand={chooseCommand}
      />
    </main>
  );
}

function Header({
  state,
  busy,
  error
}: {
  state: AgentViewState;
  busy: string | undefined;
  error: string | undefined;
}): React.JSX.Element {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brandMark">OC</div>
        <div>
          <h1>OpenCode</h1>
          <p>{state.workspacePath ?? "Open a workspace"}</p>
        </div>
      </div>
      <div className={`status ${state.connected ? "ok" : "warn"}`}>
        {busy ?? error ?? state.status}
      </div>
    </header>
  );
}

function SessionList({
  sessions,
  activeSessionId
}: {
  sessions: readonly SessionView[];
  activeSessionId?: string;
}): React.JSX.Element {
  return (
    <section className="sessions">
      <div className="sectionHeader">
        <span>Sessions</span>
        <button
          className="iconButton"
          title="New session"
          onClick={() => vscode?.postMessage({ type: "createSession" })}
        >
          +
        </button>
      </div>
      <div className="sessionList">
        {sessions.length ? (
          sessions.map((session) => (
            <button
              key={session.id}
              className={`sessionItem ${session.id === activeSessionId ? "active" : ""}`}
              onClick={() =>
                vscode?.postMessage({ type: "selectSession", sessionId: session.id })
              }
            >
              <span className="sessionTitle">{session.title}</span>
              <span className="sessionSummary">{session.summary ?? "No messages yet"}</span>
              <span className="sessionTime">{session.updatedLabel ?? ""}</span>
            </button>
          ))
        ) : (
          <p className="empty">No OpenCode sessions yet.</p>
        )}
      </div>
    </section>
  );
}

function Toolbar({
  mode,
  models,
  selectedModelId
}: {
  mode: AgentMode;
  models: readonly ModelView[];
  selectedModelId?: string;
}): React.JSX.Element {
  return (
    <section className="toolbar">
      <div className="segments" role="tablist" aria-label="Mode">
        <button
          aria-pressed={mode === "chat"}
          className={mode === "chat" ? "active" : ""}
          onClick={() => vscode?.postMessage({ type: "setMode", mode: "chat" })}
        >
          Chat
        </button>
        <button
          aria-pressed={mode === "agent"}
          className={mode === "agent" ? "active" : ""}
          onClick={() => vscode?.postMessage({ type: "setMode", mode: "agent" })}
        >
          Agent
        </button>
      </div>
      <select
        aria-label="Model"
        value={selectedModelId ?? ""}
        onChange={(event) =>
          vscode?.postMessage({ type: "selectModel", modelId: event.target.value })
        }
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </section>
  );
}

function ContextBar({
  context
}: {
  context: readonly ContextAttachment[];
}): React.JSX.Element {
  return (
    <section className="context">
      <div className="sectionHeader">
        <span>Context</span>
        <button
          className="subtleButton"
          disabled={!context.length}
          onClick={() => vscode?.postMessage({ type: "clearContext" })}
        >
          Clear
        </button>
      </div>
      {context.length ? (
        <div className="chips">
          {context.map((item) => (
            <span key={item.id} title={item.path}>
              {item.label}
              {item.truncated ? " *" : ""}
            </span>
          ))}
        </div>
      ) : (
        <p className="empty">Use editor or Explorer context menu to add files.</p>
      )}
    </section>
  );
}

function MessageList({
  messages
}: {
  messages: readonly ChatMessageView[];
}): React.JSX.Element {
  return (
    <section className="messages">
      {messages.length ? (
        messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <div className="role">{message.role}</div>
            <pre>{message.text}</pre>
          </article>
        ))
      ) : (
        <div className="empty center">Start a conversation with OpenCode.</div>
      )}
    </section>
  );
}

function Composer({
  input,
  busy,
  inputRef,
  commands,
  selectedCommandIndex,
  onSelectedCommandIndexChange,
  onInputChange,
  onSend,
  onChooseCommand
}: {
  input: string;
  busy: string | undefined;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  commands: readonly OpenCodeCommand[];
  selectedCommandIndex: number;
  onSelectedCommandIndexChange(index: number): void;
  onInputChange(value: string): void;
  onSend(): void;
  onChooseCommand(command: OpenCodeCommand, sendImmediately: boolean): void;
}): React.JSX.Element {
  const commandMenuOpen = parseSlashQuery(input) !== undefined && commands.length > 0;

  return (
    <section className="composer">
      {commandMenuOpen ? (
        <div className="commandMenu">
          {commands.map((command, index) => (
            <button
              key={command.id}
              className={index === selectedCommandIndex ? "active" : ""}
              onClick={() => onChooseCommand(command, false)}
            >
              <span>/{command.id}</span>
              <small>{command.description ?? command.agent ?? ""}</small>
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        ref={inputRef}
        value={input}
        rows={4}
        placeholder="Ask OpenCode, or type /help"
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (commandMenuOpen && event.key === "ArrowDown") {
            event.preventDefault();
            onSelectedCommandIndexChange((selectedCommandIndex + 1) % commands.length);
            return;
          }
          if (commandMenuOpen && event.key === "ArrowUp") {
            event.preventDefault();
            onSelectedCommandIndexChange(
              (selectedCommandIndex + commands.length - 1) % commands.length
            );
            return;
          }
          if (commandMenuOpen && event.key === "Tab") {
            event.preventDefault();
            onChooseCommand(commands[selectedCommandIndex], false);
            return;
          }
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            onSend();
          }
        }}
      />
      <div className="composerFooter">
        <span>Ctrl+Enter to send</span>
        <button disabled={!input.trim() || Boolean(busy)} onClick={onSend}>
          Send
        </button>
      </div>
    </section>
  );
}

function parseSlashQuery(value: string): string | undefined {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith("/")) {
    return undefined;
  }
  return trimmed.slice(1).split(/\s/, 1)[0] ?? "";
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
