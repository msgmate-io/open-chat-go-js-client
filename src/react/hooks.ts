import * as React from "react";
import type {
  Bot,
  ListBotsParams,
  ListedBotsPage,
  MCPServersResponse,
  ModelsPage,
  ToolsPage,
  UpdateBotRequest,
} from "../core/types";
import { useOpenChatClient } from "./context";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Minimal data-fetching hook (no external data library). Runs `fn`, tracks
 * loading/error/data, and exposes `refetch`. Re-runs when `deps` change.
 */
export function useAsyncData<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [tick, setTick] = React.useState(0);

  const refetch = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn().then(
      (result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, refetch };
}

/** List the caller's bots (optionally including public bots). */
export function useBots(params: ListBotsParams = {}): AsyncState<ListedBotsPage> {
  const client = useOpenChatClient();
  return useAsyncData(
    () => client.listBots(params),
    [client, params.page, params.limit, params.include_public]
  );
}

/** Fetch a single bot by UUID or owner-scoped name. */
export function useBot(identifier: string | null): AsyncState<Bot> {
  const client = useOpenChatClient();
  return useAsyncData(
    () =>
      identifier
        ? client.getBot(identifier)
        : Promise.reject(new Error("No identifier")),
    [client, identifier]
  );
}

/** Model catalog for populating the model picker. */
export function useModels(): AsyncState<ModelsPage> {
  const client = useOpenChatClient();
  return useAsyncData(() => client.listModels({ page: 1, page_size: 300 }), [client]);
}

/** Tool catalog for populating the tools picker. */
export function useTools(): AsyncState<ToolsPage> {
  const client = useOpenChatClient();
  return useAsyncData(() => client.listTools({ page: 1, page_size: 400 }), [client]);
}

/** MCP server catalog for populating integrations. */
export function useMCPServers(): AsyncState<MCPServersResponse> {
  const client = useOpenChatClient();
  return useAsyncData(() => client.listMCPServers(), [client]);
}

export interface SaveBotState {
  save: (identifier: string, patch: UpdateBotRequest) => Promise<Bot>;
  saving: boolean;
  error: Error | null;
}

/** Mutation hook for updating a bot (metadata + default_shared_config). */
export function useSaveBot(): SaveBotState {
  const client = useOpenChatClient();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const save = React.useCallback(
    async (identifier: string, patch: UpdateBotRequest) => {
      setSaving(true);
      setError(null);
      try {
        return await client.updateBot(identifier, patch);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [client]
  );

  return { save, saving, error };
}
