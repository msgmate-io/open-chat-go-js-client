/** Error thrown for any non-2xx Open Chat API response. */
export class APIRequestError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = "APIRequestError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

/** Raised when no valid browser token could be obtained. */
export class OpenChatAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenChatAuthError";
  }
}
