# @open-chat-go/client

Embeddable **TypeScript / React client** for [Open Chat](https://github.com/msgmate-io/open-chat-go).

It lets another web application (e.g. Little World) talk to an Open Chat backend
**directly from the browser** — no backend relay needed — and ship a fully styled
bot manager/editor that matches the Open Chat design system.

- **Framework-agnostic core** (`@open-chat-go/client`) — auth + typed API client.
- **React layer** (`@open-chat-go/client/react`) — `<OpenChatProvider>`, hooks, and
  ready-made `<BotManager>` / `<BotEditor>` components.
- **Bundled design system** (`@open-chat-go/client/styles.css`) — the Open Chat
  design tokens + primitives, compiled and self-contained. No external UI package
  required.

> **Integrating this into another app (or handing off to a coding agent)?** Read
> [`INTEGRATION.md`](./INTEGRATION.md) — a detailed, step-by-step integration guide
> covering the auth model, backend prerequisites, component usage, and troubleshooting.

---

## Installation

The package is distributed from a **public GitHub repo** with the built `dist/`
committed to release tags, so you can install it with no auth and no build step:

```bash
npm i github:msgmate-io/open-chat-go-js-client#<tag>
# e.g.
npm i github:msgmate-io/open-chat-go-js-client#v0.1.0
```

React is an optional peer dependency — only needed if you use the `./react` entry.

---

## How authentication works

Open Chat issues **short-lived, scope-restricted "browser tokens"** (audience
`browser-api`). They are *not* the user's long-lived API key — they are derived
from it, limited to a subset of its scopes, capped to its lifetime, and only work
on an allow-list of read/edit routes.

Your app obtains a browser token by calling
`POST /api/v1/user/browser-token` with a **parent credential**. There are two ways
to wire this into the client:

### 1. `tokenProvider` (recommended)

Your **backend** holds the user's long-lived API key, calls the exchange endpoint
server-side, and hands the short-lived token to the page. The parent key never
reaches the browser.

```ts
import { createOpenChatClient } from "@open-chat-go/client";

const client = createOpenChatClient({
  baseUrl: "https://chat.example.com",
  auth: {
    // Call your own backend, which exchanges the user's API key for a
    // short-lived browser token and returns it.
    tokenProvider: () =>
      fetch("/my-backend/open-chat-token").then((r) => r.json()),
  },
});
```

You can perform the exchange yourself with the exported helper:

```ts
import { exchangeForBrowserToken } from "@open-chat-go/client";

const browserToken = await exchangeForBrowserToken({
  baseUrl: "https://chat.example.com",
  parentToken: process.env.OPEN_CHAT_API_KEY!, // server-side only
  scopes: ["bots:read", "bots:write"],
});
```

### 2. `parentToken` (simpler, key present in browser)

The client exchanges the parent token itself and auto-refreshes the browser token.
Convenient for internal tools, but the long-lived token is in the browser — keep it
tightly scoped.

```ts
const client = createOpenChatClient({
  baseUrl: "https://chat.example.com",
  auth: { parentToken: "ocat_...", scopes: ["bots:read", "bots:write"] },
});
```

> ⚠️ A **username + password** login is *not* supported for cross-origin browser
> clients: Open Chat's login sets a session cookie, and the cookie-based exchange
> path requires a same-site Origin. Use an **API access token** instead.

The client caches the browser token, refreshes it shortly before expiry, and
retries once on `401`.

---

## Core client (framework-agnostic)

```ts
import { createOpenChatClient } from "@open-chat-go/client";

const client = createOpenChatClient({ baseUrl, auth });

const me     = await client.getSelf();
const bots   = await client.listBots({ include_public: false });
const bot    = await client.getBot(botUuid);
const saved  = await client.updateBot(botUuid, { name, default_shared_config });
const models = await client.listModels();
const tools  = await client.listTools();
const mcp    = await client.listMCPServers();
const chats  = await client.listChats();
```

Errors surface as `APIRequestError` (with `.status`, `.code`, `.payload`).

---

## React layer

Import the stylesheet once (e.g. in your app entry):

```ts
import "@open-chat-go/client/styles.css";
```

Then wrap your tree and drop in the components:

```tsx
import {
  OpenChatProvider,
  BotManager,
  createOpenChatClient,
} from "@open-chat-go/client/react";

const client = createOpenChatClient({ baseUrl, auth });

export function Settings() {
  return (
    <OpenChatProvider client={client}>
      {/* Lists bots and opens the built-in editor on selection. */}
      <BotManager onSaved={(bot) => console.log("saved", bot.uuid)} />
    </OpenChatProvider>
  );
}
```

Available pieces:

- `<OpenChatProvider client={...}>` — provides the client via context.
- `<BotManager>` — lists bots; selecting one opens `<BotEditor>`.
- `<BotEditor botUuid={...}>` — edits a bot's metadata + `default_shared_config`
  (model picker, backend/endpoint, system prompt, sampling params, tools, tool_init).
- Hooks: `useBots`, `useBot`, `useModels`, `useTools`, `useMCPServers`, `useSaveBot`,
  `useOpenChatClient`.
- Design-system primitives (`Button`, `Input`, `Card`, `Dialog`, `Badge`, …) are also
  exported from `@open-chat-go/client/react` if you want to build custom UI.

### Theming

The bundled stylesheet defines light tokens on `:root` and dark tokens under a
`.dark` class. Add `class="dark"` to a wrapper to use dark mode. Fonts fall back to
system sans; load "Signika Negative" / "DM Sans" if you want the exact Open Chat look.

---

## CORS requirement

Because the browser calls Open Chat cross-origin with a bearer token, your app's
origin must be in the Open Chat backend's `CORS_ALLOWED_ORIGINS` config. Cookies are
never used, so no credential/CORS-cookie configuration is needed.

---

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests (core client, mocked fetch)
npm run build       # tsup (ESM+CJS+d.ts) + tailwind -> dist/styles.css
```

### Layout

```
src/
  core/       framework-agnostic client (types, auth, http, errors)
  react/      provider, hooks, components, vendored design-system primitives
  styles/     Tailwind v4 entry bundling the design tokens + component styles
examples/
  react-app/  minimal Vite app demonstrating the embed
```

### Releasing

Run the **Release** workflow (`.github/workflows/release.yml`) via
`Actions → Release → Run workflow`. It typechecks, tests, builds, commits `dist/`,
and creates/updates the tag. Keeping `dist/` committed is what makes the git-URL
install work without a build step.
