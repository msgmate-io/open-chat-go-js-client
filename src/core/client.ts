import { TokenManager, type ClientAuth } from "./auth";
import { APIRequestError } from "./errors";
import type {
  Bot,
  BotSharedConfig,
  InteractionStatus,
  ListBotsParams,
  ListedBotsPage,
  ListedChatsPage,
  ListedMessagesPage,
  MCPServersResponse,
  ModelsPage,
  ToolsPage,
  UpdateBotRequest,
  UserSelf,
} from "./types";

export interface OpenChatClientOptions {
  /** Base URL of the Open Chat backend, e.g. "https://chat.example.com". */
  baseUrl: string;
  /** How to obtain a short-lived browser token. */
  auth: ClientAuth;
  /** Optional fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Set false to skip retrying once on a 401. */
  retryOn401?: boolean;
}

/**
 * Framework-agnostic Open Chat API client.
 *
 * Authenticates with a short-lived, scope-restricted browser token (obtained
 * via the configured {@link ClientAuth}) and exposes typed methods for the
 * allow-listed browser-token routes: user, bots (list/read/update/config),
 * catalogs (models/tools/MCP servers), and read-only interactions.
 */
export class OpenChatClient {
  readonly baseUrl: string;
  private tokens: TokenManager;
  private fetchImpl: typeof fetch;

  constructor(options: OpenChatClientOptions) {
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
  invalidateToken(): void {
    this.tokens.invalidate();
  }

  // ---------------------------------------------------------------- user

  async getSelf(): Promise<UserSelf> {
    return this.request<UserSelf>("/user/self", { method: "GET" });
  }

  // ---------------------------------------------------------------- bots

  async listBots(params: ListBotsParams = {}): Promise<ListedBotsPage> {
    return this.request<ListedBotsPage>("/bots/list", {
      method: "GET",
      query: {
        page: params.page,
        limit: params.limit,
        include_public: params.include_public,
      },
    });
  }

  async getBot(identifier: string): Promise<Bot> {
    return this.request<Bot>(`/bots/${encodeURIComponent(identifier)}`, {
      method: "GET",
    });
  }

  async updateBot(identifier: string, patch: UpdateBotRequest): Promise<Bot> {
    return this.request<Bot>(`/bots/${encodeURIComponent(identifier)}`, {
      method: "PATCH",
      body: patch,
    });
  }

  /** Replace a bot's default_shared_config after server-side validation. */
  async saveBotConfig(
    identifier: string,
    config: BotSharedConfig
  ): Promise<Bot> {
    return this.request<Bot>(`/bots/${encodeURIComponent(identifier)}/config`, {
      method: "PUT",
      body: config,
    });
  }

  // ------------------------------------------------------------- catalogs

  async listModels(
    params: { page?: number; page_size?: number } = {}
  ): Promise<ModelsPage> {
    return this.request<ModelsPage>("/models", {
      method: "GET",
      query: { page: params.page, page_size: params.page_size },
    });
  }

  async listTools(
    params: { page?: number; page_size?: number } = {}
  ): Promise<ToolsPage> {
    return this.request<ToolsPage>("/tools", {
      method: "GET",
      query: { page: params.page, page_size: params.page_size },
    });
  }

  async listMCPServers(): Promise<MCPServersResponse> {
    return this.request<MCPServersResponse>("/integrations/mcp/servers", {
      method: "GET",
    });
  }

  // --------------------------------------------------------- interactions

  async listChats(
    params: { page?: number; limit?: number } = {}
  ): Promise<ListedChatsPage> {
    return this.request<ListedChatsPage>("/chats/list", {
      method: "GET",
      query: { page: params.page, limit: params.limit },
    });
  }

  async getChat(chatUuid: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      `/chats/${encodeURIComponent(chatUuid)}`,
      { method: "GET" }
    );
  }

  async listMessages(
    chatUuid: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<ListedMessagesPage> {
    return this.request<ListedMessagesPage>(
      `/chats/${encodeURIComponent(chatUuid)}/messages/list`,
      { method: "GET", query: { page: params.page, limit: params.limit } }
    );
  }

  async getInteractionStatus(chatUuid: string): Promise<InteractionStatus> {
    return this.request<InteractionStatus>(
      `/chats/${encodeURIComponent(chatUuid)}/status`,
      { method: "GET" }
    );
  }

  // -------------------------------------------------------------- private

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const retryOn401 = options.retryOn401 !== false;
    try {
      return await this.doRequest<T>(path, options);
    } catch (err) {
      if (retryOn401 && err instanceof APIRequestError && err.status === 401) {
        this.tokens.invalidate();
        return this.doRequest<T>(path, options);
      }
      throw err;
    }
  }

  private async doRequest<T>(path: string, options: RequestOptions): Promise<T> {
    const token = await this.tokens.getToken();
    const url = this.buildUrl(path, options.query);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      throw new APIRequestError(`Network error calling ${path}: ${String(err)}`, 0);
    }

    if (!res.ok) {
      const { message, code, payload } = await parseError(res);
      throw new APIRequestError(message, res.status, code, payload);
    }

    if (res.status === 204) {
      return undefined as T;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = `${this.baseUrl}/api/v1${path}`;
    if (!query) return url;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }
}

/** Convenience factory mirroring the class constructor. */
export function createOpenChatClient(options: OpenChatClientOptions): OpenChatClient {
  return new OpenChatClient(options);
}

async function parseError(res: Response): Promise<{
  message: string;
  code?: string;
  payload?: unknown;
}> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }
  let payload: unknown;
  let code: string | undefined;
  let message = `Request failed with status ${res.status}`;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      payload = parsed;
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
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
