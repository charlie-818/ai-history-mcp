/**
 * Tool: list_sessions
 * Purpose: List session summaries with optional filters.
 */
import { z } from "zod";
import { MetricsStore } from "../store.js";
import { SessionSummary } from "../schema.js";
export declare const listSessionsInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
    environment: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    project?: string | undefined;
    environment?: string | undefined;
}, {
    project?: string | undefined;
    environment?: string | undefined;
    limit?: number | undefined;
}>;
export type ListSessionsInput = z.infer<typeof listSessionsInputSchema>;
/**
 * Create the list_sessions tool handler
 */
export declare function createListSessionsTool(store: MetricsStore): (input: unknown) => Promise<SessionSummary[]>;
export declare const listSessionsToolDefinition: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            project: {
                type: string;
                description: string;
            };
            environment: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
                default: number;
            };
        };
        required: never[];
    };
};
//# sourceMappingURL=list-sessions.d.ts.map