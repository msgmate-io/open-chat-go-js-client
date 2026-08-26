/**
 * Public API token scopes understood by the Open Chat backend.
 * Browser tokens are default-deny and only work on allow-listed routes.
 */
type OpenChatScope = "bots:read" | "bots:write" | "interactions:list" | "interactions:read";
/** Response of POST /api/v1/user/browser-token. */
interface BrowserToken {
    access_token: string;
    token_type: string;
    /** RFC 3339 timestamp. */
    expires_at: string;
    expires_in: number;
    scopes: string[];
    api_base_url: string;
}
/** Request body of POST /api/v1/user/browser-token. */
interface BrowserTokenExchangeRequest {
    scopes: OpenChatScope[];
    ttl_seconds?: number;
    label?: string;
}
/** A bot runtime configuration record (BotDTO). */
interface Bot {
    uuid: string;
    owner_user_uuid: string;
    bot_user_uuid: string;
    bot_username: string;
    bot_contact_token: string;
    name: string;
    description: string;
    default_shared_config: BotSharedConfig;
    is_public: boolean;
    is_active: boolean;
}
/** Paginated bot list (GET /api/v1/bots/list). */
interface ListedBotsPage {
    limit: number;
    page: number;
    total_pages: number;
    rows: Bot[];
}
interface ListBotsParams {
    page?: number;
    limit?: number;
    include_public?: boolean;
}
/**
 * The bot's `default_shared_config`. Only `model` and `backend` are required;
 * everything else is optional and validated server-side.
 */
interface BotSharedConfig {
    model: string;
    backend: string;
    endpoint?: string;
    system_prompt?: string;
    temperature?: number;
    top_p?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    max_tokens?: number;
    context?: number;
    tool_call_max_total?: number;
    tool_call_max_failed?: number;
    reasoning?: boolean;
    persist_tool_init?: boolean;
    tools?: string[];
    integrations?: string[];
    tool_init?: Record<string, Record<string, unknown>>;
    [key: string]: unknown;
}
/** PATCH /api/v1/bots/{identifier} request body. */
interface UpdateBotRequest {
    name?: string;
    description?: string;
    default_shared_config?: BotSharedConfig;
    is_public?: boolean;
    is_active?: boolean;
}
/** A model catalog row (GET /api/v1/models). */
interface Model {
    uuid?: string;
    model_id: string;
    title?: string;
    configuration?: {
        backend?: string;
        endpoint?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
interface ModelsPage {
    page?: number;
    page_size?: number;
    total_rows?: number;
    total_pages?: number;
    rows: Model[];
}
/** A tool catalog row (GET /api/v1/tools). */
interface Tool {
    name: string;
    function_name?: string;
    description?: string;
    type?: string;
    requires_init?: boolean;
    init_schema?: Record<string, unknown>;
    [key: string]: unknown;
}
interface ToolsPage {
    page?: number;
    page_size?: number;
    total_rows?: number;
    total_pages?: number;
    rows: Tool[];
}
/** An MCP server row (GET /api/v1/integrations/mcp/servers). */
interface MCPServer {
    name: string;
    enabled: boolean;
    auth_connected: boolean;
    [key: string]: unknown;
}
interface MCPServersResponse {
    rows: MCPServer[];
}
/** The authenticated user (GET /api/v1/user/self). */
interface UserSelf {
    uuid?: string;
    name?: string;
    username?: string;
    email?: string;
    is_admin?: boolean;
    [key: string]: unknown;
}
/** A chat row (GET /api/v1/chats/list). */
interface ListedChat {
    uuid: string;
    partner?: Record<string, unknown>;
    latest_message?: Record<string, unknown> | null;
    chat_type?: string;
    config?: unknown;
    chat_share_uuid?: string;
    shared_interaction_url?: string;
}
interface ListedChatsPage {
    limit: number;
    page: number;
    total_pages: number;
    rows: ListedChat[];
}
/** A message row (GET /api/v1/chats/{uuid}/messages/list). */
interface ListedMessage {
    uuid: string;
    send_at: string;
    sender_id: number;
    receiver_id: number;
    sender_uuid: string;
    sender_is_automated: boolean;
    data_type: string;
    text: string;
    reasoning?: string[] | null;
    tool_calls?: unknown[] | null;
    meta_data?: Record<string, unknown> | null;
}
interface ListedMessagesPage {
    limit: number;
    page: number;
    total_pages: number;
    rows: ListedMessage[];
}
/** Interaction status (GET /api/v1/chats/{uuid}/status). */
interface InteractionStatus {
    chat_uuid: string;
    is_active: boolean;
    state: string;
    latest_message_uuid?: string;
    latest_message_finished?: boolean;
    source: string;
}

/**
 * A callback the host application implements to supply a fresh short-lived
 * browser token. This is the recommended mode: the host's backend holds the
 * long-lived API key, calls the exchange endpoint server-side, and returns
 * the ephemeral token — so the parent credential never reaches the browser.
 */
type BrowserTokenProvider = () => Promise<BrowserToken>;
/** Auth mode where the client exchanges a parent API token itself. */
interface ParentTokenAuth {
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
type ClientAuth = {
    tokenProvider: BrowserTokenProvider;
} | ParentTokenAuth;
/**
 * Exchange a parent API token for a short-lived, scope-restricted browser
 * token via POST /api/v1/user/browser-token. Exposed so hosts can perform the
 * exchange themselves (e.g. server-side) and feed the result to the client via
 * a `tokenProvider`.
 */
declare function exchangeForBrowserToken(opts: {
    baseUrl: string;
    parentToken: string;
    scopes: OpenChatScope[];
    ttlSeconds?: number;
    label?: string;
    fetchImpl?: typeof fetch;
}): Promise<BrowserToken>;
/**
 * Caches a browser token and refreshes it on demand. Supports both the
 * `tokenProvider` and `parentToken` auth modes.
 */
declare class TokenManager {
    private auth;
    private baseUrl;
    private fetchImpl;
    private cached;
    private inflight;
    constructor(auth: ClientAuth, baseUrl: string, fetchImpl?: typeof fetch);
    /** Return a currently-valid bearer token, refreshing if stale. */
    getToken(): Promise<string>;
    /** Force the next getToken() to fetch a fresh token (e.g. after a 401). */
    invalidate(): void;
    private refresh;
    private doRefresh;
    private isStale;
}

interface OpenChatClientOptions {
    /** Base URL of the Open Chat backend, e.g. "https://chat.example.com". */
    baseUrl: string;
    /** How to obtain a short-lived browser token. */
    auth: ClientAuth;
    /** Optional fetch implementation (defaults to global fetch). */
    fetchImpl?: typeof fetch;
}
/**
 * Framework-agnostic Open Chat API client.
 *
 * Authenticates with a short-lived, scope-restricted browser token (obtained
 * via the configured {@link ClientAuth}) and exposes typed methods for the
 * allow-listed browser-token routes: user, bots (list/read/update/config),
 * catalogs (models/tools/MCP servers), and read-only interactions.
 */
declare class OpenChatClient {
    readonly baseUrl: string;
    private tokens;
    private fetchImpl;
    constructor(options: OpenChatClientOptions);
    /** Force-refresh the cached browser token on the next request. */
    invalidateToken(): void;
    getSelf(): Promise<UserSelf>;
    listBots(params?: ListBotsParams): Promise<ListedBotsPage>;
    getBot(identifier: string): Promise<Bot>;
    updateBot(identifier: string, patch: UpdateBotRequest): Promise<Bot>;
    /** Replace a bot's default_shared_config after server-side validation. */
    saveBotConfig(identifier: string, config: BotSharedConfig): Promise<Bot>;
    listModels(params?: {
        page?: number;
        page_size?: number;
    }): Promise<ModelsPage>;
    listTools(params?: {
        page?: number;
        page_size?: number;
    }): Promise<ToolsPage>;
    listMCPServers(): Promise<MCPServersResponse>;
    listChats(params?: {
        page?: number;
        limit?: number;
    }): Promise<ListedChatsPage>;
    getChat(chatUuid: string): Promise<Record<string, unknown>>;
    listMessages(chatUuid: string, params?: {
        page?: number;
        limit?: number;
    }): Promise<ListedMessagesPage>;
    getInteractionStatus(chatUuid: string): Promise<InteractionStatus>;
    private request;
    private doRequest;
    private buildUrl;
}
/** Convenience factory mirroring the class constructor. */
declare function createOpenChatClient(options: OpenChatClientOptions): OpenChatClient;

/** Error thrown for any non-2xx Open Chat API response. */
declare class APIRequestError extends Error {
    status: number;
    code?: string;
    payload?: unknown;
    constructor(message: string, status: number, code?: string, payload?: unknown);
}
/** Raised when no valid browser token could be obtained. */
declare class OpenChatAuthError extends Error {
    constructor(message: string);
}

export { APIRequestError, type Bot, type BotSharedConfig, type BrowserToken, type BrowserTokenExchangeRequest, type BrowserTokenProvider, type ClientAuth, type InteractionStatus, type ListBotsParams, type ListedBotsPage, type ListedChat, type ListedChatsPage, type ListedMessage, type ListedMessagesPage, type MCPServer, type MCPServersResponse, type Model, type ModelsPage, OpenChatAuthError, OpenChatClient, type OpenChatClientOptions, type OpenChatScope, type ParentTokenAuth, TokenManager, type Tool, type ToolsPage, type UpdateBotRequest, type UserSelf, createOpenChatClient, exchangeForBrowserToken };
