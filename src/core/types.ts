/**
 * Public API token scopes understood by the Open Chat backend.
 * Browser tokens are default-deny and only work on allow-listed routes.
 */
export type OpenChatScope =
  | "bots:read"
  | "bots:write"
  | "interactions:list"
  | "interactions:read";

/** Response of POST /api/v1/user/browser-token. */
export interface BrowserToken {
  access_token: string;
  token_type: string;
  /** RFC 3339 timestamp. */
  expires_at: string;
  expires_in: number;
  scopes: string[];
  api_base_url: string;
}

/** Request body of POST /api/v1/user/browser-token. */
export interface BrowserTokenExchangeRequest {
  scopes: OpenChatScope[];
  ttl_seconds?: number;
  label?: string;
}

/** A bot runtime configuration record (BotDTO). */
export interface Bot {
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
export interface ListedBotsPage {
  limit: number;
  page: number;
  total_pages: number;
  rows: Bot[];
}

export interface ListBotsParams {
  page?: number;
  limit?: number;
  include_public?: boolean;
}

/**
 * The bot's `default_shared_config`. Only `model` and `backend` are required;
 * everything else is optional and validated server-side.
 */
export interface BotSharedConfig {
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
export interface UpdateBotRequest {
  name?: string;
  description?: string;
  default_shared_config?: BotSharedConfig;
  is_public?: boolean;
  is_active?: boolean;
}

/** A model catalog row (GET /api/v1/models). */
export interface Model {
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

export interface ModelsPage {
  page?: number;
  page_size?: number;
  total_rows?: number;
  total_pages?: number;
  rows: Model[];
}

/** A tool catalog row (GET /api/v1/tools). */
export interface Tool {
  name: string;
  function_name?: string;
  description?: string;
  type?: string;
  requires_init?: boolean;
  init_schema?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ToolsPage {
  page?: number;
  page_size?: number;
  total_rows?: number;
  total_pages?: number;
  rows: Tool[];
}

/** An MCP server row (GET /api/v1/integrations/mcp/servers). */
export interface MCPServer {
  name: string;
  enabled: boolean;
  auth_connected: boolean;
  [key: string]: unknown;
}

export interface MCPServersResponse {
  rows: MCPServer[];
}

/** The authenticated user (GET /api/v1/user/self). */
export interface UserSelf {
  uuid?: string;
  name?: string;
  username?: string;
  email?: string;
  is_admin?: boolean;
  [key: string]: unknown;
}

/** A chat row (GET /api/v1/chats/list). */
export interface ListedChat {
  uuid: string;
  partner?: Record<string, unknown>;
  latest_message?: Record<string, unknown> | null;
  chat_type?: string;
  config?: unknown;
  chat_share_uuid?: string;
  shared_interaction_url?: string;
}

export interface ListedChatsPage {
  limit: number;
  page: number;
  total_pages: number;
  rows: ListedChat[];
}

/** A message row (GET /api/v1/chats/{uuid}/messages/list). */
export interface ListedMessage {
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

export interface ListedMessagesPage {
  limit: number;
  page: number;
  total_pages: number;
  rows: ListedMessage[];
}

/** Interaction status (GET /api/v1/chats/{uuid}/status). */
export interface InteractionStatus {
  chat_uuid: string;
  is_active: boolean;
  state: string;
  latest_message_uuid?: string;
  latest_message_finished?: boolean;
  source: string;
}
