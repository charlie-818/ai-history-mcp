/**
 * Storage interface and implementations for AI usage metrics.
 * The MetricsStore interface allows swapping storage backends (in-memory, Postgres, etc.)
 */

import { randomUUID } from "crypto";
import {
  ModelCallLog,
  SessionSummary,
  AggregateMetrics,
  SearchCallsParams,
  ListSessionsParams,
  AggregateMetricsParams,
  LogCallInput,
} from "./schema.js";

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
export class InMemoryMetricsStore implements MetricsStore {
  private calls: Map<string, ModelCallLog> = new Map();
  private sessionIndex: Map<string, Set<string>> = new Map();

  async logCall(input: LogCallInput): Promise<ModelCallLog> {
    const call: ModelCallLog = {
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

  async getCall(id: string): Promise<ModelCallLog | null> {
    return this.calls.get(id) ?? null;
  }

  async searchCalls(params: SearchCallsParams): Promise<ModelCallLog[]> {
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

  async listSessions(params: ListSessionsParams): Promise<SessionSummary[]> {
    const { project, environment, limit } = params;

    // Group calls by sessionId
    const sessionMap = new Map<string, ModelCallLog[]>();

    for (const call of this.calls.values()) {
      if (!call.sessionId) continue;

      // Apply filters
      if (project && call.project !== project) continue;
      if (environment && call.environment !== environment) continue;

      const sessionCalls = sessionMap.get(call.sessionId) ?? [];
      sessionCalls.push(call);
      sessionMap.set(call.sessionId, sessionCalls);
    }

    // Build summaries
    const summaries: SessionSummary[] = [];

    for (const [sessionId, calls] of sessionMap) {
      if (calls.length === 0) continue;

      // Sort calls by timestamp
      calls.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const firstCall = calls[0];
      const lastCall = calls[calls.length - 1];

      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let totalLatency = 0;
      let latencyCount = 0;

      for (const call of calls) {
        if (call.tokensIn) totalTokensIn += call.tokensIn;
        if (call.tokensOut) totalTokensOut += call.tokensOut;
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

  async getSession(sessionId: string): Promise<ModelCallLog[]> {
    const callIds = this.sessionIndex.get(sessionId);
    if (!callIds) return [];

    const calls: ModelCallLog[] = [];
    for (const id of callIds) {
      const call = this.calls.get(id);
      if (call) calls.push(call);
    }

    // Sort by timestamp ascending
    calls.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return calls;
  }

  async getAggregateMetrics(params: AggregateMetricsParams): Promise<AggregateMetrics> {
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
      if (call.tokensIn) totalTokensIn += call.tokensIn;
      if (call.tokensOut) totalTokensOut += call.tokensOut;
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
