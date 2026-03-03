/**
 * Tool: get_session_calls
 * Purpose: Get all model calls for a specific session.
 */
import { z } from "zod";
// Input validation schema
export const getSessionCallsInputSchema = z.object({
    sessionId: z.string().min(1, "sessionId is required"),
});
/**
 * Create the get_session_calls tool handler
 */
export function createGetSessionCallsTool(store) {
    return async (input) => {
        const parsed = getSessionCallsInputSchema.parse(input);
        return store.getSession(parsed.sessionId);
    };
}
// MCP tool definition
export const getSessionCallsToolDefinition = {
    name: "get_session_calls",
    description: "Get all model calls for a specific session, sorted by timestamp (oldest first).",
    inputSchema: {
        type: "object",
        properties: {
            sessionId: {
                type: "string",
                description: "The session ID to retrieve calls for",
            },
        },
        required: ["sessionId"],
    },
};
//# sourceMappingURL=get-session-calls.js.map