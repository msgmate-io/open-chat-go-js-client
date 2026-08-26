# Open Chat JS Client — Integration Guide

> **Audience:** an AI coding agent (or developer) integrating the `@open-chat-go/client`
> package into a host web application (e.g. Little World) so that Open Chat bot
> management can run **directly from the browser** with no per-request backend relay.
>
> Read this whole document before writing code. The **authentication model** section is
> the part most integrators get wrong.

---

## 1. What this client is

`@open-chat-go/client` is an embeddable TypeScript/React client for an
[Open Chat](https://github.com/msgmate-io/open-chat-go) backend. It has three layers,
exposed as subpath exports:

| Import path                        | What it is                                                        | Needs React? |
| ---------------------------------- | ----------------------------------------------------------------- | ------------ |
| `@open-chat-go/client`             | Framework-agnostic core: auth + typed API client                  | No           |
| `@open-chat-go/client/react`       | React provider, hooks, `BotManager`/`BotEditor`, UI primitives    | Yes          |
| `@open-chat-go/client/styles.css`  | Bundled Open Chat design system (tokens + component styles)       | No           |

The package is distributed from a **public GitHub repo** with the built `dist/`
committed to release tags, so it installs with no auth and no build step.

The goal of the integration: the host app's browser talks to Open Chat **directly**
(over CORS, with a bearer token) instead of proxying every call through the host's own
backend. The host backend is only needed once, to mint the short-lived token (see §4).

---

## 2. Prerequisites (Open Chat backend config)

Before any frontend code will work, confirm these on the Open Chat backend you are
integrating with:

1. **CORS allow-list.** The host app's origin must be listed in the backend's
   `CORS_ALLOWED_ORIGINS` config (comma-separated, exact scheme+host, e.g.
   `https://app.littleworld.example`). Without this, every browser request fails with a
   CORS error. Wildcards are rejected by the backend at startup.
   - The client authenticates with **Bearer tokens only** — cookies are never used — so
     no cookie/CORS-credentials configuration is needed.

2. **A user account + API access token.** The integration acts on behalf of an Open Chat
   user (the "bot owner"). That user must have a **long-lived API access token**
   (created in Open Chat under *Profile → API keys*, or via
   `POST /api/v1/user/access-tokens`). This long-lived token is the **parent credential**.

3. **Browser-token endpoints available.** The backend must support
   `POST /api/v1/user/browser-token` (token exchange) and the allow-listed routes in §6.
   These are standard on current Open Chat builds.

> You do **not** need to change any allow-list or scope configuration yourself — the
> routes and scopes referenced in this guide are already built into the backend.

---

## 3. Installation

```bash
npm i github:msgmate-io/open-chat-go-js-client#<tag>
# e.g.
npm i github:msgmate-io/open-chat-go-js-client#v0.1.0
```

- `react` and `react-dom` are **optional peer dependencies** — only required if you use
  the `./react` entry.
- The package ships ESM, CJS, and `.d.ts` for both entries, plus `styles.css`.

---

## 4. Authentication model — READ THIS CAREFULLY

This is the critical section. Open Chat uses **two kinds of token**:

| Token | Lifetime | Where it should live | Purpose |
| ----- | -------- | -------------------- | ------- |
| **API access token** (parent) | Long-lived | **Host backend only** | The user's real credential. Used only to mint browser tokens. |
| **Browser token** (child) | Short-lived (default 900s, max 3600s) | Browser is fine | What the JS client actually sends on API calls. |

A **browser token** (audience `browser-api`) is:
- **Short-lived** — default 900 seconds, hard max 3600 (server-configurable).
- **Scope-restricted** — it can only ever have a subset of its parent's scopes.
- **Default-deny** — it only works on an explicit allow-list of routes (§6); every other
  route rejects it regardless of scopes.
- **Parent-bound** — it is invalidated the moment the parent token is revoked or expires,
  and its lifetime is capped to the parent's remaining lifetime.

### How a browser token is minted

`POST /api/v1/user/browser-token`, authenticated with the **parent** credential. Body:

```json
{ "scopes": ["bots:read", "bots:write"], "ttl_seconds": 900, "label": "lw-embed" }
```

Response:

```json
{
  "access_token": "ocat_...",
  "token_type": "Bearer",
  "expires_at": "2026-08-26T01:00:00Z",
  "expires_in": 899,
  "scopes": ["bots:read", "bots:write"],
  "api_base_url": "https://chat.example.com"
}
```

### The two ways to wire this into the client

#### ✅ Mode A — `tokenProvider` (RECOMMENDED)

The **host backend** holds the long-lived API key, calls the exchange endpoint
server-side, and returns the short-lived browser token to the frontend. The parent key
**never reaches the browser.** This is the mode you should build.

```ts
import { createOpenChatClient } from "@open-chat-go/client";

const client = createOpenChatClient({
  baseUrl: "https://chat.example.com",
  auth: {
    // Calls YOUR backend, which exchanges the user's API key for a browser token.
    tokenProvider: async () => {
      const res = await fetch("/api/open-chat/browser-token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to obtain Open Chat browser token");
      return res.json(); // must resolve to the BrowserToken shape above
    },
  },
});
```

Your backend endpoint (`/api/open-chat/browser-token`) does the exchange. It must return
the `BrowserToken` JSON shape. Example (Node/Express; adapt to your stack):

```js
app.post("/api/open-chat/browser-token", requireAuth, async (req, res) => {
  // 1. Look up the Open Chat API key for the signed-in user (stored server-side).
  const parentToken = await getOpenChatApiKeyFor(req.user);

  // 2. Exchange it for a short-lived browser token.
  const r = await fetch(`${OPEN_CHAT_BASE_URL}/api/v1/user/browser-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      scopes: ["bots:read", "bots:write"], // only what the embed needs
      label: "lw-embed",
    }),
  });
  if (!r.ok) return res.status(r.status).send(await r.text());

  // 3. Return the BrowserToken JSON to the frontend.
  res.json(await r.json());
});
```

> You can cache the browser token server-side until near its `expires_at` to avoid an
> exchange on every page load, but it is cheap to just re-exchange each time.

#### ⚠️ Mode B — `parentToken` (key present in browser — internal tools only)

The client performs the exchange itself and auto-refreshes. Simpler, but the long-lived
key is in the browser bundle/memory, so **only use for internal/trusted tools** and keep
the key tightly scoped.

```ts
const client = createOpenChatClient({
  baseUrl: "https://chat.example.com",
  auth: { parentToken: "ocat_...", scopes: ["bots:read", "bots:write"] },
});
```

#### Standalone exchange helper

If you want to do the exchange yourself (e.g. in your backend) you can use the exported
helper instead of hand-rolling the `fetch`:

```ts
import { exchangeForBrowserToken } from "@open-chat-go/client";

const browserToken = await exchangeForBrowserToken({
  baseUrl: "https://chat.example.com",
  parentToken: process.env.OPEN_CHAT_API_KEY!, // server-side only
  scopes: ["bots:read", "bots:write"],
  ttlSeconds: 900,   // optional
  label: "lw-embed", // optional
});
```

### Token lifecycle (handled for you)

Whichever mode you use, the client **caches** the browser token, **refreshes** it shortly
before expiry (60s leeway), and **retries once** on a `401` by fetching a fresh token.
You normally do not manage token lifetime yourself.

### ❌ What does NOT work

- **Username + password login is not supported** for a cross-origin browser client.
  Open Chat's `/user/login` sets a session cookie, and the cookie-authenticated exchange
  path requires a **same-site Origin** (CSRF protection) — a cross-origin app fails it.
  **Use an API access token.**
- **Exchanging with an already-restricted token fails.** A browser token cannot mint
  another browser token ("Restricted tokens cannot exchange browser tokens"). The parent
  must be a full API access token.
- **Requesting scopes the parent doesn't have fails** with `403 requested scopes exceed
  parent token authority`.

---

## 5. Scopes reference

Request only what the embed needs.

| Scope                 | Grants                                                        |
| --------------------- | ------------------------------------------------------------- |
| `bots:read`           | List/get bots + read the model/tool/MCP catalogs              |
| `bots:write`          | Update bot metadata + `default_shared_config`                 |
| `interactions:list`   | List interaction chats                                        |
| `interactions:read`   | Read a chat, its messages, and its status                     |

**For the embedded bot manager/editor you need exactly `["bots:read", "bots:write"]`.**
Add the `interactions:*` scopes only if you also build interaction viewing.

---

## 6. Allow-listed routes (what a browser token can call)

Browser tokens are default-deny; these are the only routes they may hit (all under
`/api/v1`):

| Method & path                              | Required scope        | Client method            |
| ------------------------------------------ | --------------------- | ------------------------ |
| `GET /user/self`                           | any valid token       | `getSelf()`              |
| `GET /bots/list`                           | `bots:read`           | `listBots()`             |
| `GET /bots/{identifier}`                   | `bots:read`           | `getBot()`               |
| `PATCH /bots/{identifier}`                 | `bots:write`          | `updateBot()`            |
| `PUT /bots/{identifier}/config`            | `bots:write`          | `saveBotConfig()`        |
| `GET /models`                              | `bots:read`           | `listModels()`           |
| `GET /tools`                               | `bots:read`           | `listTools()`            |
| `GET /integrations/mcp/servers`            | `bots:read`           | `listMCPServers()`       |
| `GET /chats/list`                          | `interactions:list`   | `listChats()`            |
| `GET /chats/{uuid}`                        | `interactions:read`   | `getChat()`              |
| `GET /chats/{uuid}/messages/list`          | `interactions:read`   | `listMessages()`         |
| `GET /chats/{uuid}/status`                 | `interactions:read`   | `getInteractionStatus()` |

Anything else (creating/deleting bots, starting interactions, admin, etc.) is **not**
available to a browser token by design.

---

## 7. Core client API (framework-agnostic)

```ts
import { createOpenChatClient, APIRequestError } from "@open-chat-go/client";

const client = createOpenChatClient({ baseUrl, auth });

const me     = await client.getSelf();
const page   = await client.listBots({ page: 1, limit: 40, include_public: false });
const bot    = await client.getBot(botUuid);                 // uuid or owner-scoped name
const saved  = await client.updateBot(botUuid, { name, description, default_shared_config, is_public, is_active });
const bot2   = await client.saveBotConfig(botUuid, config);  // replace default_shared_config only
const models = await client.listModels({ page: 1, page_size: 300 });
const tools  = await client.listTools({ page: 1, page_size: 400 });
const mcp    = await client.listMCPServers();
const chats  = await client.listChats({ page: 1, limit: 40 });
const msgs   = await client.listMessages(chatUuid, { page: 1, limit: 50 });
const status = await client.getInteractionStatus(chatUuid);
```

- All methods return typed objects (see `src/core/types.ts` in the package).
- Errors throw `APIRequestError` with `.status`, `.code`, `.payload`. Auth bootstrap
  failures throw `OpenChatAuthError`.
- `client.invalidateToken()` forces a fresh token on the next call.

---

## 8. React integration

### 8.1 Setup

Import the stylesheet **once**, in your app entry:

```ts
import "@open-chat-go/client/styles.css";
```

Create one client and provide it:

```tsx
import {
  OpenChatProvider,
  createOpenChatClient,
} from "@open-chat-go/client/react";

const client = createOpenChatClient({ baseUrl, auth });

export function App() {
  return (
    <OpenChatProvider client={client}>
      <MyOpenChatSection />
    </OpenChatProvider>
  );
}
```

> `createOpenChatClient`, `exchangeForBrowserToken`, and the error classes are also
> re-exported from `@open-chat-go/client/react` so you can import everything from one
> place.

### 8.2 Ready-made components

**`<BotManager>`** — lists the caller's bots; selecting one opens the built-in editor.

```tsx
import { BotManager } from "@open-chat-go/client/react";

<BotManager
  includePublic={false}
  onSelectBot={(bot) => console.log("opened", bot.uuid)}
  onSaved={(bot) => console.log("saved", bot.uuid)}
/>;
```

Props: `includePublic?: boolean`, `onSelectBot?: (bot) => void`,
`onSaved?: (bot) => void`, `className?: string`.

**`<BotEditor>`** — edits one bot's metadata + `default_shared_config` (model picker,
backend/endpoint, system prompt, sampling params, tools, tool_init). `BotManager` renders
this internally, but you can use it standalone:

```tsx
import { BotEditor } from "@open-chat-go/client/react";

<BotEditor botUuid={botUuid} onBack={() => {}} onSaved={(bot) => {}} />;
```

Props: `botUuid: string`, `onBack?: () => void`, `onSaved?: (bot) => void`,
`className?: string`.

Saving uses a single `PATCH /bots/{identifier}` with
`{ name, description, is_public, is_active, default_shared_config }`.

### 8.3 Hooks (build your own UI)

```tsx
import {
  useBots, useBot, useModels, useTools, useMCPServers, useSaveBot,
  useOpenChatClient,
} from "@open-chat-go/client/react";

const { data, loading, error, refetch } = useBots({ include_public: false });
const bot = useBot(botUuid);
const { save, saving, error: saveError } = useSaveBot();
```

Each `use*` hook returns `{ data, loading, error, refetch }`. `useSaveBot().save(uuid,
patch)` returns the updated bot and throws on failure.

### 8.4 Design-system primitives

The vendored Open Chat primitives are exported from `@open-chat-go/client/react` if you
want to build custom UI that matches: `Button`, `Input`, `Textarea`, `Text`, `Card`
(+`CardHeader/Title/Description/Content/Footer`), `Badge`, `Label`, `Checkbox`, `Dialog`
(+parts), `LoadingSpinner`, and `cn`.

---

## 9. Bot `default_shared_config` schema

The object the editor writes into a bot. Only `model` and `backend` are required; the
rest are optional and validated server-side.

| Key | Type | Notes |
| --- | ---- | ----- |
| `model` | string | **Required**, non-empty. |
| `backend` | string | **Required**, non-empty (e.g. `openai`, `anthropic`). |
| `endpoint` | string | Optional, non-empty when provided. |
| `system_prompt` | string | Optional, non-empty when provided. |
| `temperature`, `top_p`, `presence_penalty`, `frequency_penalty` | number | Optional, finite. `0` is a valid value (not "unset"). |
| `max_tokens`, `context`, `tool_call_max_total`, `tool_call_max_failed` | integer | Optional, must be a positive integer (≥ 1). |
| `reasoning`, `persist_tool_init` | boolean | Optional. |
| `tools` | string[] | Tool names the bot may call. |
| `integrations` | string[] | Integration names (e.g. MCP servers). |
| `tool_init` | object | Map of `tool_name -> init object`. Keys must match tools in `tools`. |

Validation gotchas (server returns `400` with a message):
- `tool_init` keys must correspond to tools listed in `tools` (and be real tools).
- Numeric fields must be the right kind (finite float vs positive integer).

---

## 10. Theming & styling

- `styles.css` defines **light** tokens on `:root` and **dark** tokens under a `.dark`
  class. Wrap the embed in an element with `class="dark"` to use dark mode.
- Styles are scoped to Open Chat's component classes + Tailwind utilities; importing the
  stylesheet once is enough. It sets a default `body` background/font, so if you only
  want the component styles, scope the embed and override as needed.
- Fonts fall back to system sans. Load **"Signika Negative"** (headings) and **"DM Sans"**
  (body) if you want the exact Open Chat look.

---

## 11. Step-by-step integration walkthrough

A checklist to integrate the bot manager into a host app:

1. **Backend (host):**
   - [ ] Store each user's Open Chat **API access token** server-side.
   - [ ] Add an auth-protected endpoint (e.g. `POST /api/open-chat/browser-token`) that
         exchanges the user's API key for a browser token with
         `scopes: ["bots:read","bots:write"]` and returns the `BrowserToken` JSON (§4A).
2. **Open Chat backend:**
   - [ ] Confirm the host origin is in `CORS_ALLOWED_ORIGINS` (§2).
3. **Frontend (host):**
   - [ ] `npm i github:msgmate-io/open-chat-go-js-client#<tag>`.
   - [ ] `import "@open-chat-go/client/styles.css"` once.
   - [ ] `createOpenChatClient({ baseUrl, auth: { tokenProvider } })`.
   - [ ] Wrap the target area in `<OpenChatProvider client={client}>`.
   - [ ] Render `<BotManager />` (or `<BotEditor botUuid={...} />`).
4. **Verify** using the checklist in §13.

---

## 12. Security checklist

- [ ] The long-lived Open Chat API key is **server-side only** (Mode A). Never ship it in
      the browser bundle, env vars exposed to the client, or localStorage.
- [ ] Request the **minimum scopes** (`bots:read`,`bots:write` for the bot editor).
- [ ] The host endpoint that mints browser tokens is **authenticated** (only the signed-in
      owner can mint a token for their own account).
- [ ] Do not log browser tokens or API keys.
- [ ] Treat `default_shared_config` as user-editable input; the server validates it, but
      surface `400` messages to the user.

---

## 13. Troubleshooting / verification

**Quick verification sequence** (with a valid setup):
1. `client.getSelf()` returns the owner → auth + CORS are working.
2. `client.listBots()` returns rows → `bots:read` + allow-list working.
3. `<BotManager>` renders and opens the editor → React layer working.
4. Saving a bot returns the updated bot → `bots:write` working.

**Error reference:**

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| CORS error in browser console | Host origin not in `CORS_ALLOWED_ORIGINS` | Add the exact origin to the backend config (§2). |
| `OpenChatAuthError: exchange failed with status 403` | Parent token lacks requested scopes, or is itself restricted | Use a full API token; request only scopes the parent has. |
| `403 Origin does not match request host` | Tried the cookie/session exchange path cross-origin | Use the bearer/API-token path (§4), not username+password. |
| `403 Restricted tokens cannot exchange browser tokens` | Parent is a browser token | Use a long-lived API access token as the parent. |
| `401` on an API call then success | Token expired; client auto-refreshed | Normal — no action. Persistent `401` → check token provider. |
| `400 default_shared_config.*` | Invalid config field | Read the message; fix type/value per §9. |
| `404 Bot not found` on save | Wrong identifier or not owner | Use the bot `uuid`; browser tokens only act as the token's owner. |
| `tokenProvider returned no access_token` | Your endpoint didn't return the `BrowserToken` shape | Return the exact JSON from `/user/browser-token` (§4). |

---

## 14. Package exports quick reference

```ts
// Core (framework-agnostic)
import {
  createOpenChatClient, OpenChatClient,
  exchangeForBrowserToken, TokenManager,
  APIRequestError, OpenChatAuthError,
} from "@open-chat-go/client";
import type {
  Bot, BotSharedConfig, BrowserToken, ListedBotsPage, Model, Tool,
  MCPServer, UpdateBotRequest, OpenChatScope, /* ... */
} from "@open-chat-go/client";

// React
import {
  OpenChatProvider, useOpenChatClient,
  BotManager, BotEditor,
  useBots, useBot, useModels, useTools, useMCPServers, useSaveBot, useAsyncData,
  createOpenChatClient, exchangeForBrowserToken,   // re-exported for convenience
  Button, Input, Textarea, Text, Card, Badge, Label, Checkbox, Dialog,
  LoadingSpinner, cn,
} from "@open-chat-go/client/react";

// Styles (once, in your entry)
import "@open-chat-go/client/styles.css";
```
