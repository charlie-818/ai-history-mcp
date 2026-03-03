/**
 * Storage interface and implementations for AI usage metrics.
 * The MetricsStore interface allows swapping storage backends (in-memory, Postgres, etc.)
 */
import { ModelCallLog, SessionSummary, AggregateMetrics, SearchCallsParams, ListSessionsParams, AggregateMetricsParams, LogCallInput } from "./schema.js";
/**
 * Interface for metrics storage backends.
 * Implement this interface to add support for different databases.
 */
export interface MetricsStore {
    /**
     * Log a new model call.
     * @param call The call data (id and timestamp will be auto-generated)
     * @returns The complete log entry with generated id and timestamp
     */
    logCall(call: LogCallInput): Promise<ModelCallLog>;
    /**
     * Retrieve a specific call by ID.
     * @param id The call ID
     * @returns The call log or null if not found
     */
    getCall(id: string): Promise<ModelCallLog | null>;
    /**
     * Search for calls matching the given criteria.
     * @param params Search parameters
     * @returns Array of matching calls
     */
    searchCalls(params: SearchCallsParams): Promise<ModelCallLog[]>;
    /**
     * List session summaries.
     * @param params Filter parameters
     * @returns Array of session summaries
     */
    listSessions(params: ListSessionsParams): Promise<SessionSummary[]>;
    /**
     * Get all calls for a specific session.
     * @param sessionId The session ID
     * @returns Array of calls in the session
     */
    getSession(sessionId: string): Promise<ModelCallLog[]>;
    /**
     * Get aggregate metrics across calls.
     * @param params Filter parameters
     * @returns Aggregate metrics
     */
    getAggregateMetrics(params: AggregateMetricsParams): Promise<AggregateMetrics>;
}
/**
 * In-memory implementation of MetricsStore.
 * Suitable for development and testing. Data is lost on restart.
 * Thread-safe for single-process concurrent usage.
 */
export declare class InMemoryMetricsStore implements MetricsStore {
    private calls;
    private sessionIndex;
    logCall(input: LogCallInput): Promise<ModelCallLog>;
    getCall(id: string): Promise<ModelCallLog | null>;
    searchCalls(params: SearchCallsParams): Promise<ModelCallLog[]>;
    listSessions(params: ListSessionsParams): Promise<SessionSummary[]>;
    getSession(sessionId: string): Promise<ModelCallLog[]>;
    getAggregateMetrics(params: AggregateMetricsParams): Promise<AggregateMetrics>;
}
//# sourceMappingURL=store.d.ts.map