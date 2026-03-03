/**
 * Tool: get_aggregate_metrics
 * Purpose: Get aggregate metrics across model calls.
 */
import { z } from "zod";
import { MetricsStore } from "../store.js";
import { AggregateMetrics } from "../schema.js";
export declare const getAggregateMetricsInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
    environment: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    project?: string | undefined;
    environment?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    project?: string | undefined;
    environment?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
export type GetAggregateMetricsInput = z.infer<typeof getAggregateMetricsInputSchema>;
/**
 * Create the get_aggregate_metrics tool handler
 */
export declare function createGetAggregateMetricsTool(store: MetricsStore): (input: unknown) => Promise<AggregateMetrics>;
export declare const getAggregateMetricsToolDefinition: {
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
            from: {
                type: string;
                description: string;
            };
            to: {
                type: string;
                description: string;
            };
        };
        required: never[];
    };
};
//# sourceMappingURL=get-aggregate-metrics.d.ts.map