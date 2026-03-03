/**
 * MCP Resource handlers for AI usage metrics.
 * Resources provide read-only access to stored data.
 *
 * Resource namespace: "ai-usage"
 * Available resources:
 *   - calls/{id} - Get a specific call log
 *   - sessions/{sessionId} - Get session summary and calls
 *   - metrics/aggregate - Get aggregate metrics (with query params)
 */
import { MetricsStore } from "../store.js";
import { ModelCallLog, SessionSummary, AggregateMetrics } from "../schema.js";
/**
 * Response for session resource
 */
export interface SessionResourceResponse {
    session: SessionSummary | null;
    calls: ModelCallLog[];
}
/**
 * Create resource handlers for the MCP server
 */
export declare function createResourceHandlers(store: MetricsStore): {
    /**
     * Handle calls/{id} resource
     */
    getCall(id: string): Promise<ModelCallLog | null>;
    /**
     * Handle sessions/{sessionId} resource
     */
    getSession(sessionId: string): Promise<SessionResourceResponse>;
    /**
     * Handle metrics/aggregate resource with query params
     */
    getAggregateMetrics(queryString: string): Promise<AggregateMetrics>;
};
/**
 * Resource template definitions for MCP registration
 */
export declare const resourceTemplates: {
    uriTemplate: string;
    name: string;
    description: string;
    mimeType: string;
}[];
//# sourceMappingURL=index.d.ts.map