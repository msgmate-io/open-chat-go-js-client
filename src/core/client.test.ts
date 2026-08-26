import { describe, expect, it, vi } from "vitest";
import { TokenManager, exchangeForBrowserToken } from "./auth";
import { OpenChatClient, createOpenChatClient } from "./client";
import { APIRequestError, OpenChatAuthError } from "./errors";
import type { BrowserToken } from "./types";

function makeToken(overrides: Partial<BrowserToken> = {}): BrowserToken {
  return {
    access_token: "tok_abc",
    token_type: "Bearer",
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    expires_in: 600,
    scopes: ["bots:read"],
    api_base_url: "http://localhost:1984",
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("exchangeForBrowserToken", () => {
  it("posts scopes and returns the token", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(200, makeToken())
    );
    const token = await exchangeForBrowserToken({
      baseUrl: "http://x/",
      parentToken: "parent",
      scopes: ["bots:read"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(token.access_token).toBe("tok_abc");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://x/api/v1/user/browser-token");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer parent",
    });
  });

  it("throws OpenChatAuthError on non-2xx", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 403 }));
    await expect(
      exchangeForBrowserToken({
        baseUrl: "http://x",
        parentToken: "parent",
        scopes: ["bots:read"],
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(OpenChatAuthError);
  });
});

describe("TokenManager", () => {
  it("caches a fresh token across calls", async () => {
    const provider = vi.fn(async () => makeToken());
    const tm = new TokenManager({ tokenProvider: provider }, "http://x");
    await tm.getToken();
    await tm.getToken();
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the token is near expiry", async () => {
    const provider = vi.fn(async () =>
      makeToken({ expires_at: new Date(Date.now() + 5_000).toISOString(), expires_in: 5 })
    );
    const tm = new TokenManager({ tokenProvider: provider }, "http://x");
    await tm.getToken();
    await tm.getToken();
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("refreshes after invalidate()", async () => {
    const provider = vi.fn(async () => makeToken());
    const tm = new TokenManager({ tokenProvider: provider }, "http://x");
    await tm.getToken();
    tm.invalidate();
    await tm.getToken();
    expect(provider).toHaveBeenCalledTimes(2);
  });
});

describe("OpenChatClient", () => {
  const auth = { tokenProvider: async () => makeToken() };

  it("builds URLs under /api/v1 with query params", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(200, { rows: [] })
    );
    const client = createOpenChatClient({
      baseUrl: "http://x/",
      auth,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.listBots({ page: 2, limit: 10, include_public: true });
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain("http://x/api/v1/bots/list?");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
    expect(url).toContain("include_public=true");
  });

  it("sends bearer token and JSON body on update", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(200, { uuid: "b1" })
    );
    const client = new OpenChatClient({
      baseUrl: "http://x",
      auth,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.updateBot("b1", { name: "New" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://x/api/v1/bots/b1");
    expect((init as RequestInit).method).toBe("PATCH");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok_abc",
      "Content-Type": "application/json",
    });
    expect((init as RequestInit).body).toBe(JSON.stringify({ name: "New" }));
  });

  it("throws APIRequestError with status on failure", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, { error: "bad config" })
    );
    const client = new OpenChatClient({
      baseUrl: "http://x",
      auth,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const err = await client
      .getBot("missing")
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(APIRequestError);
    expect((err as APIRequestError).status).toBe(400);
    expect((err as APIRequestError).message).toBe("bad config");
  });

  it("retries once after a 401 by refreshing the token", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) return jsonResponse(401, { error: "expired" });
      return jsonResponse(200, { uuid: "b1" });
    });
    const provider = vi.fn(async () => makeToken({ access_token: `tok_${call}` }));
    const client = new OpenChatClient({
      baseUrl: "http://x",
      auth: { tokenProvider: provider },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const bot = await client.getBot("b1");
    expect(bot.uuid).toBe("b1");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(provider).toHaveBeenCalledTimes(2);
  });
});
