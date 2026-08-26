import { useMemo, useState } from "react";
import {
  BotManager,
  OpenChatProvider,
  createOpenChatClient,
} from "@open-chat-go/client/react";

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:1984");
  const [parentToken, setParentToken] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const client = useMemo(() => {
    if (!submitted || !parentToken.trim()) return null;
    // NOTE: for production, prefer a tokenProvider that mints the short-lived
    // browser token server-side, so the long-lived API key never ships to the
    // browser. This example uses parentToken for simplicity.
    return createOpenChatClient({
      baseUrl: baseUrl.trim(),
      auth: {
        parentToken: parentToken.trim(),
        scopes: ["bots:read", "bots:write"],
      },
    });
  }, [baseUrl, parentToken, submitted]);

  return (
    <div style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 className="type-heading5" style={{ marginBottom: "1rem" }}>
        Open Chat — Embedded Bot Manager
      </h1>

      {!client ? (
        <form
          className="surface-panel"
          style={{ display: "flex", flexDirection: "column", gap: 12, padding: 24 }}
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>Open Chat base URL</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:1984"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>API access token (parent)</span>
            <input
              value={parentToken}
              onChange={(e) => setParentToken(e.target.value)}
              placeholder="ocat_..."
            />
          </label>
          <button type="submit">Connect</button>
        </form>
      ) : (
        <OpenChatProvider client={client}>
          <BotManager
            onSaved={(bot) => console.log("saved bot", bot.uuid)}
          />
        </OpenChatProvider>
      )}
    </div>
  );
}
