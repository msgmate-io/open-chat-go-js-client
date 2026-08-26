// src/core/errors.ts
var APIRequestError = class extends Error {
  constructor(message, status, code, payload) {
    super(message);
    this.name = "APIRequestError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
};
var OpenChatAuthError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "OpenChatAuthError";
  }
};

// src/core/auth.ts
var REFRESH_LEEWAY_SECONDS = 60;
function isTokenProviderAuth(auth) {
  return typeof auth.tokenProvider === "function";
}
async function exchangeForBrowserToken(opts) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${trimSlash(opts.baseUrl)}/api/v1/user/browser-token`;
  const body = { scopes: opts.scopes };
  if (opts.ttlSeconds !== void 0) body.ttl_seconds = opts.ttlSeconds;
  if (opts.label !== void 0) body.label = opts.label;
  let res;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.parentToken}`
      },
      body: JSON.stringify(body)
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
  const token = await res.json();
  if (!token || typeof token.access_token !== "string" || token.access_token === "") {
    throw new OpenChatAuthError("Browser token exchange returned no access_token");
  }
  return token;
}
var TokenManager = class {
  constructor(auth, baseUrl, fetchImpl) {
    this.cached = null;
    this.inflight = null;
    this.auth = auth;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl ?? fetch;
  }
  /** Return a currently-valid bearer token, refreshing if stale. */
  async getToken() {
    if (this.cached && !this.isStale(this.cached)) {
      return this.cached.access_token;
    }
    return this.refresh();
  }
  /** Force the next getToken() to fetch a fresh token (e.g. after a 401). */
  invalidate() {
    this.cached = null;
  }
  async refresh() {
    if (!this.inflight) {
      this.inflight = this.doRefresh().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }
  async doRefresh() {
    let token;
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
        fetchImpl: this.fetchImpl
      });
    }
    this.cached = token;
    return token.access_token;
  }
  isStale(token) {
    const expiresAtMs = parseExpiry(token);
    if (expiresAtMs === null) {
      return false;
    }
    return expiresAtMs - Date.now() <= REFRESH_LEEWAY_SECONDS * 1e3;
  }
};
function parseExpiry(token) {
  if (token.expires_at) {
    const parsed = Date.parse(token.expires_at);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof token.expires_in === "number" && token.expires_in > 0) {
    return Date.now() + token.expires_in * 1e3;
  }
  return null;
}
function trimSlash(url) {
  return url.replace(/\/+$/, "");
}
async function safeReadText(res) {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

// src/core/client.ts
var OpenChatClient = class {
  constructor(options) {
    if (!options || !options.baseUrl) {
      throw new Error("OpenChatClient requires a baseUrl");
    }
    if (!options.auth) {
      throw new Error("OpenChatClient requires auth");
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.tokens = new TokenManager(options.auth, this.baseUrl, this.fetchImpl);
  }
  /** Force-refresh the cached browser token on the next request. */
  invalidateToken() {
    this.tokens.invalidate();
  }
  // ---------------------------------------------------------------- user
  async getSelf() {
    return this.request("/user/self", { method: "GET" });
  }
  // ---------------------------------------------------------------- bots
  async listBots(params = {}) {
    return this.request("/bots/list", {
      method: "GET",
      query: {
        page: params.page,
        limit: params.limit,
        include_public: params.include_public
      }
    });
  }
  async getBot(identifier) {
    return this.request(`/bots/${encodeURIComponent(identifier)}`, {
      method: "GET"
    });
  }
  async updateBot(identifier, patch) {
    return this.request(`/bots/${encodeURIComponent(identifier)}`, {
      method: "PATCH",
      body: patch
    });
  }
  /** Replace a bot's default_shared_config after server-side validation. */
  async saveBotConfig(identifier, config) {
    return this.request(`/bots/${encodeURIComponent(identifier)}/config`, {
      method: "PUT",
      body: config
    });
  }
  // ------------------------------------------------------------- catalogs
  async listModels(params = {}) {
    return this.request("/models", {
      method: "GET",
      query: { page: params.page, page_size: params.page_size }
    });
  }
  async listTools(params = {}) {
    return this.request("/tools", {
      method: "GET",
      query: { page: params.page, page_size: params.page_size }
    });
  }
  async listMCPServers() {
    return this.request("/integrations/mcp/servers", {
      method: "GET"
    });
  }
  // --------------------------------------------------------- interactions
  async listChats(params = {}) {
    return this.request("/chats/list", {
      method: "GET",
      query: { page: params.page, limit: params.limit }
    });
  }
  async getChat(chatUuid) {
    return this.request(
      `/chats/${encodeURIComponent(chatUuid)}`,
      { method: "GET" }
    );
  }
  async listMessages(chatUuid, params = {}) {
    return this.request(
      `/chats/${encodeURIComponent(chatUuid)}/messages/list`,
      { method: "GET", query: { page: params.page, limit: params.limit } }
    );
  }
  async getInteractionStatus(chatUuid) {
    return this.request(
      `/chats/${encodeURIComponent(chatUuid)}/status`,
      { method: "GET" }
    );
  }
  // -------------------------------------------------------------- private
  async request(path, options = {}) {
    const retryOn401 = options.retryOn401 !== false;
    try {
      return await this.doRequest(path, options);
    } catch (err) {
      if (retryOn401 && err instanceof APIRequestError && err.status === 401) {
        this.tokens.invalidate();
        return this.doRequest(path, options);
      }
      throw err;
    }
  }
  async doRequest(path, options) {
    const token = await this.tokens.getToken();
    const url = this.buildUrl(path, options.query);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    };
    if (options.body !== void 0) {
      headers["Content-Type"] = "application/json";
    }
    let res;
    try {
      res = await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body !== void 0 ? JSON.stringify(options.body) : void 0
      });
    } catch (err) {
      throw new APIRequestError(`Network error calling ${path}: ${String(err)}`, 0);
    }
    if (!res.ok) {
      const { message, code, payload } = await parseError(res);
      throw new APIRequestError(message, res.status, code, payload);
    }
    if (res.status === 204) {
      return void 0;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  }
  buildUrl(path, query) {
    const url = `${this.baseUrl}/api/v1${path}`;
    if (!query) return url;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === void 0 || value === null) continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }
};
function createOpenChatClient(options) {
  return new OpenChatClient(options);
}
async function parseError(res) {
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }
  let payload;
  let code;
  let message = `Request failed with status ${res.status}`;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      payload = parsed;
      if (parsed && typeof parsed === "object") {
        const obj = parsed;
        if (typeof obj.error === "string") message = obj.error;
        else if (typeof obj.message === "string") message = obj.message;
        if (typeof obj.code === "string") code = obj.code;
      }
    } catch {
      message = text.slice(0, 500);
    }
  }
  return { message, code, payload };
}

export { APIRequestError, OpenChatAuthError, OpenChatClient, TokenManager, createOpenChatClient, exchangeForBrowserToken };
//# sourceMappingURL=chunk-IF2WR3M5.js.map
//# sourceMappingURL=chunk-IF2WR3M5.js.map