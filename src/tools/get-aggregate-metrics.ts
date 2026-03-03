/**
 * Tool: get_aggregate_metrics
 * Purpose: Get aggregate metrics across model calls.
 */

import { z } from "zod";
import { MetricsStore } from "../store.js";
import { AggregateMetrics, AggregateMetricsParams } from "../schema.js";

// Input validation schema
export const getAggregateMetricsInputSchema = z.object({
  project: z.string().optional(),
  environment: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type GetAggregateMetricsInput = z.infer<typeof getAggregateMetricsInputSchema>;

/**
 * Create the get_aggregate_metrics tool handler
 */
export function createGetAggregateMetricsTool(store: MetricsStore) {
  return async (input: unknown): Promise<AggregateMetrics> => {
    const parsed = getAggregateMetricsInputSchema.parse(input);

    const params: AggregateMetricsParams = {
      project: parsed.project,
      environment: parsed.environment,
      from: parsed.from,
      to: parsed.to,
    };

    return store.getAggregateMetrics(params);
  };
}

// MCP tool definition
export const getAggregateMetricsToolDefinition = {
  name: "get_aggregate_metrics",
  description:
    "Get aggregate metrics (call count, total tokens, average latency) across model calls with optional filters.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project: {
        type: "string",
        description: "Filter by project",
      },
      environment: {
        type: "string",
        description: "Filter by environment (dev, staging, prod)",
      },
      from: {
        type: "string",
        description: "Filter calls from this ISO date onwards",
      },
      to: {
        type: "string",
        description: "Filter calls up to this ISO date",
      },
    },
    required: [],
  },
};
