/**
 * Tool: get_session_calls
 * Purpose: Get all model calls for a specific session.
 */

import { z } from "zod";
import { MetricsStore } from "../store.js";
import { ModelCallLog } from "../schema.js";

// Input validation schema
export const getSessionCallsInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
});

export type GetSessionCallsInput = z.infer<typeof getSessionCallsInputSchema>;

/**
 * Create the get_session_calls tool handler
 */
export function createGetSessionCallsTool(store: MetricsStore) {
  return async (input: unknown): Promise<ModelCallLog[]> => {
    const parsed = getSessionCallsInputSchema.parse(input);
    return store.getSession(parsed.sessionId);
  };
}

// MCP tool definition
export const getSessionCallsToolDefinition = {
  name: "get_session_calls",
  description:
    "Get all model calls for a specific session, sorted by timestamp (oldest first).",
  inputSchema: {
    type: "object" as const,
    properties: {
      sessionId: {
        type: "string",
        description: "The session ID to retrieve calls for",
      },
    },
    required: ["sessionId"],
  },
};
