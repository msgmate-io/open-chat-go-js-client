import { OpenChatAuthError } from "./errors";
import type {
  BrowserToken,
  BrowserTokenExchangeRequest,
  OpenChatScope,
} from "./types";

/** Minimum remaining lifetime (seconds) before a token is considered stale. */
const REFRESH_LEEWAY_SECONDS = 60;

/**
 * A callback the host application implements to supply a fresh short-lived
 * browser token. This is the recommended mode: the host's backend holds the
 * long-lived API key, calls the exchange endpoint server-side, and returns
 * the ephemeral token — so the parent credential never reaches the browser.
 */
export type BrowserTokenProvider = () => Promise<BrowserToken>;

/** Auth mode where the client exchanges a parent API token itself. */
export interface ParentTokenAuth {
  /** Long-lived Open Chat API access token used as the exchange parent. */
  parentToken: string;
  /** Scopes to request for the browser token. Defaults to bot scopes. */
  scopes?: OpenChatScope[];
  /** Requested browser-token lifetime in seconds (server clamps to its max). */
  ttlSeconds?: number;
  /** Optional label recorded on the minted token. */
  label?: string;
}

/**
 * How the client obtains a browser token.
 *
 * - `tokenProvider`: host supplies tokens (recommended; parent key stays
 *   server-side).
 * - `parentToken`: client performs the exchange itself (simpler, but the
 *   parent token is present in the browser, so keep it tightly scoped).
 */
export type ClientAuth = { tokenProvider: BrowserTokenProvider } | ParentTokenAuth;

function isTokenProviderAuth(
  auth: ClientAuth
): auth is { tokenProvider: BrowserTokenProvider } {
  return typeof (auth as { tokenProvider?: unknown }).tokenProvider === "function";
}

/**
 * Exchange a parent API token for a short-lived, scope-restricted browser
 * token via POST /api/v1/user/browser-token. Exposed so hosts can perform the
 * exchange themselves (e.g. server-side) and feed the result to the client via
 * a `tokenProvider`.
 */
export async function exchangeForBrowserToken(opts: {
  baseUrl: string;
  parentToken: string;
  scopes: OpenChatScope[];
  ttlSeconds?: number;
  label?: string;
  fetchImpl?: typeof fetch;
}): Promise<BrowserToken> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${trimSlash(opts.baseUrl)}/api/v1/user/browser-token`;
  const body: BrowserTokenExchangeRequest = { scopes: opts.scopes };
  if (opts.ttlSeconds !== undefined) body.ttl_seconds = opts.ttlSeconds;
  if (opts.label !== undefined) body.label = opts.label;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.parentToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new OpenChatAuthError(
      `Failed to reach Open Chat token endpoint: ${String(err)}`
    );
  }

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new OpenChatAuthError(
      `Browser token exchange failed with status ${res.status}${text ? `: ${text}` : ""}`
    );
  }

  const token = (await res.json()) as BrowserToken;
  if (!token || typeof token.access_token !== "string" || token.access_token === "") {
    throw new OpenChatAuthError("Browser token exchange returned no access_token");
  }
  return token;
}

/**
 * Caches a browser token and refreshes it on demand. Supports both the
 * `tokenProvider` and `parentToken` auth modes.
 */
export class TokenManager {
  private auth: ClientAuth;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private cached: BrowserToken | null = null;
  private inflight: Promise<string> | null = null;

  constructor(auth: ClientAuth, baseUrl: string, fetchImpl?: typeof fetch) {
    this.auth = auth;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl ?? fetch;
  }

  /** Return a currently-valid bearer token, refreshing if stale. */
  async getToken(): Promise<string> {
    if (this.cached && !this.isStale(this.cached)) {
      return this.cached.access_token;
    }
    return this.refresh();
  }

  /** Force the next getToken() to fetch a fresh token (e.g. after a 401). */
  invalidate(): void {
    this.cached = null;
  }

  private async refresh(): Promise<string> {
    if (!this.inflight) {
      this.inflight = this.doRefresh().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  private async doRefresh(): Promise<string> {
    let token: BrowserToken;
    if (isTokenProviderAuth(this.auth)) {
      try {
        token = await this.auth.tokenProvider();
      } catch (err) {
        throw new OpenChatAuthError(
          `tokenProvider failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      if (!token || typeof token.access_token !== "string" || token.access_token === "") {
        throw new OpenChatAuthError("tokenProvider returned no access_token");
      }
    } else {
      token = await exchangeForBrowserToken({
        baseUrl: this.baseUrl,
        parentToken: this.auth.parentToken,
        scopes: this.auth.scopes ?? ["bots:read", "bots:write"],
        ttlSeconds: this.auth.ttlSeconds,
        label: this.auth.label,
        fetchImpl: this.fetchImpl,
      });
    }
    this.cached = token;
    return token.access_token;
  }

  private isStale(token: BrowserToken): boolean {
    const expiresAtMs = parseExpiry(token);
    if (expiresAtMs === null) {
      // No expiry info available; use the token as-is.
      return false;
    }
    return expiresAtMs - Date.now() <= REFRESH_LEEWAY_SECONDS * 1000;
  }
}

function parseExpiry(token: BrowserToken): number | null {
  if (token.expires_at) {
    const parsed = Date.parse(token.expires_at);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof token.expires_in === "number" && token.expires_in > 0) {
    return Date.now() + token.expires_in * 1000;
  }
  return null;
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}
