/**
 * Tool: search_model_calls
 * Purpose: Search for logged model calls with various filters.
 */
import { z } from "zod";
import { MetricsStore } from "../store.js";
import { ModelCallLog } from "../schema.js";
export declare const searchModelCallsInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
    environment: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    modelName: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    project?: string | undefined;
    environment?: string | undefined;
    userId?: string | undefined;
    modelName?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    project?: string | undefined;
    environment?: string | undefined;
    userId?: string | undefined;
    modelName?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    limit?: number | undefined;
}>;
export type SearchModelCallsInput = z.infer<typeof searchModelCallsInputSchema>;
/**
 * Create the search_model_calls tool handler
 */
export declare function createSearchModelCallsTool(store: MetricsStore): (input: unknown) => Promise<ModelCallLog[]>;
export declare const searchModelCallsToolDefinition: {
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
            userId: {
                type: string;
                description: string;
            };
            modelName: {
                type: string;
                description: string;
            };
            from: {
                type: string;
                description: string;
            };
            to: {
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
//# sourceMappingURL=search-model-calls.d.ts.map