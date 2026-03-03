/**
 * Tool: get_session_calls
 * Purpose: Get all model calls for a specific session.
 */
import { z } from "zod";
import { MetricsStore } from "../store.js";
import { ModelCallLog } from "../schema.js";
export declare const getSessionCallsInputSchema: z.ZodObject<{
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
}, {
    sessionId: string;
}>;
export type GetSessionCallsInput = z.infer<typeof getSessionCallsInputSchema>;
/**
 * Create the get_session_calls tool handler
 */
export declare function createGetSessionCallsTool(store: MetricsStore): (input: unknown) => Promise<ModelCallLog[]>;
export declare const getSessionCallsToolDefinition: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            sessionId: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
//# sourceMappingURL=get-session-calls.d.ts.map