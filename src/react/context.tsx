import * as React from "react";
import type { OpenChatClient } from "../core/client";

const OpenChatContext = React.createContext<OpenChatClient | null>(null);

export interface OpenChatProviderProps {
  client: OpenChatClient;
  children: React.ReactNode;
}

/**
 * Provides an {@link OpenChatClient} to the embedded Open Chat components and
 * hooks. Create the client once (e.g. with `createOpenChatClient`) and pass it
 * here.
 */
export function OpenChatProvider({ client, children }: OpenChatProviderProps) {
  return (
    <OpenChatContext.Provider value={client}>
      {children}
    </OpenChatContext.Provider>
  );
}

/** Access the {@link OpenChatClient} from context. */
export function useOpenChatClient(): OpenChatClient {
  const client = React.useContext(OpenChatContext);
  if (!client) {
    throw new Error(
      "useOpenChatClient must be used within an <OpenChatProvider>"
    );
  }
  return client;
}
