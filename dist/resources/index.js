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
/**
 * Parse query string into key-value pairs
 */
function parseQueryString(queryString) {
    const params = {};
    if (!queryString)
        return params;
    const pairs = queryString.split("&");
    for (const pair of pairs) {
        const [key, value] = pair.split("=");
        if (key) {
            params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
        }
    }
    return params;
}
/**
 * Create resource handlers for the MCP server
 */
export function createResourceHandlers(store) {
    return {
        /**
         * Handle calls/{id} resource
         */
        async getCall(id) {
            return store.getCall(id);
        },
        /**
         * Handle sessions/{sessionId} resource
         */
        async getSession(sessionId) {
            const calls = await store.getSession(sessionId);
            if (calls.length === 0) {
                return { session: null, calls: [] };
            }
            // Build session summary
            const firstCall = calls[0];
            const lastCall = calls[calls.length - 1];
            let totalTokensIn = 0;
            let totalTokensOut = 0;
            let totalLatency = 0;
            let latencyCount = 0;
            for (const call of calls) {
                if (call.tokensIn)
                    totalTokensIn += call.tokensIn;
                if (call.tokensOut)
                    totalTokensOut += call.tokensOut;
                if (call.latencyMs) {
                    totalLatency += call.latencyMs;
                    latencyCount++;
                }
            }
            const session = {
                sessionId,
                project: firstCall.project,
                environment: firstCall.environment,
                firstCallAt: firstCall.timestamp,
                lastCallAt: lastCall.timestamp,
                callCount: calls.length,
                totalTokensIn,
                totalTokensOut,
                avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : undefined,
            };
            return { session, calls };
        },
        /**
         * Handle metrics/aggregate resource with query params
         */
        async getAggregateMetrics(queryString) {
            const params = parseQueryString(queryString);
            return store.getAggregateMetrics({
                project: params.project,
                environment: params.environment,
                from: params.from,
                to: params.to,
            });
        },
    };
}
/**
 * Resource template definitions for MCP registration
 */
export const resourceTemplates = [
    {
        uriTemplate: "ai-usage://calls/{id}",
        name: "Model Call Log",
        description: "Get a specific model call log by ID",
        mimeType: "application/json",
    },
    {
        uriTemplate: "ai-usage://sessions/{sessionId}",
        name: "Session Details",
        description: "Get session summary and all calls for a session",
        mimeType: "application/json",
    },
    {
        uriTemplate: "ai-usage://metrics/aggregate",
        name: "Aggregate Metrics",
        description: "Get aggregate metrics. Query params: project, environment, from, to",
        mimeType: "application/json",
    },
];
//# sourceMappingURL=index.js.map