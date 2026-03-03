/**
 * Storage interface and implementations for AI usage metrics.
 * The MetricsStore interface allows swapping storage backends (in-memory, Postgres, etc.)
 */
import { randomUUID } from "crypto";
/**
 * In-memory implementation of MetricsStore.
 * Suitable for development and testing. Data is lost on restart.
 * Thread-safe for single-process concurrent usage.
 */
export class InMemoryMetricsStore {
    calls = new Map();
    sessionIndex = new Map();
    async logCall(input) {
        const call = {
            ...input,
            id: randomUUID(),
            timestamp: new Date().toISOString(),
        };
        this.calls.set(call.id, call);
        // Index by session if sessionId is provided
        if (call.sessionId) {
            const sessionCalls = this.sessionIndex.get(call.sessionId) ?? new Set();
            sessionCalls.add(call.id);
            this.sessionIndex.set(call.sessionId, sessionCalls);
        }
        return call;
    }
    async getCall(id) {
        return this.calls.get(id) ?? null;
    }
    async searchCalls(params) {
        const { project, environment, userId, modelName, from, to, limit } = params;
        let results = Array.from(this.calls.values());
        // Apply filters
        if (project) {
            results = results.filter((c) => c.project === project);
        }
        if (environment) {
            results = results.filter((c) => c.environment === environment);
        }
        if (userId) {
            results = results.filter((c) => c.userId === userId);
        }
        if (modelName) {
            results = results.filter((c) => c.modelName === modelName);
        }
        if (from) {
            const fromDate = new Date(from);
            results = results.filter((c) => new Date(c.timestamp) >= fromDate);
        }
        if (to) {
            const toDate = new Date(to);
            results = results.filter((c) => new Date(c.timestamp) <= toDate);
        }
        // Sort by timestamp descending (most recent first)
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Apply limit
        if (limit && limit > 0) {
            results = results.slice(0, limit);
        }
        return results;
    }
    async listSessions(params) {
        const { project, environment, limit } = params;
        // Group calls by sessionId
        const sessionMap = new Map();
        for (const call of this.calls.values()) {
            if (!call.sessionId)
                continue;
            // Apply filters
            if (project && call.project !== project)
                continue;
            if (environment && call.environment !== environment)
                continue;
            const sessionCalls = sessionMap.get(call.sessionId) ?? [];
            sessionCalls.push(call);
            sessionMap.set(call.sessionId, sessionCalls);
        }
        // Build summaries
        const summaries = [];
        for (const [sessionId, calls] of sessionMap) {
            if (calls.length === 0)
                continue;
            // Sort calls by timestamp
            calls.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
            summaries.push({
                sessionId,
                project: firstCall.project,
                environment: firstCall.environment,
                firstCallAt: firstCall.timestamp,
                lastCallAt: lastCall.timestamp,
                callCount: calls.length,
                totalTokensIn,
                totalTokensOut,
                avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : undefined,
            });
        }
        // Sort by lastCallAt descending
        summaries.sort((a, b) => new Date(b.lastCallAt).getTime() - new Date(a.lastCallAt).getTime());
        // Apply limit
        if (limit && limit > 0) {
            return summaries.slice(0, limit);
        }
        return summaries;
    }
    async getSession(sessionId) {
        const callIds = this.sessionIndex.get(sessionId);
        if (!callIds)
            return [];
        const calls = [];
        for (const id of callIds) {
            const call = this.calls.get(id);
            if (call)
                calls.push(call);
        }
        // Sort by timestamp ascending
        calls.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return calls;
    }
    async getAggregateMetrics(params) {
        const { project, environment, from, to } = params;
        let calls = Array.from(this.calls.values());
        // Apply filters
        if (project) {
            calls = calls.filter((c) => c.project === project);
        }
        if (environment) {
            calls = calls.filter((c) => c.environment === environment);
        }
        if (from) {
            const fromDate = new Date(from);
            calls = calls.filter((c) => new Date(c.timestamp) >= fromDate);
        }
        if (to) {
            const toDate = new Date(to);
            calls = calls.filter((c) => new Date(c.timestamp) <= toDate);
        }
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
        return {
            callCount: calls.length,
            totalTokensIn,
            totalTokensOut,
            avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : undefined,
        };
    }
}
//# sourceMappingURL=store.js.map