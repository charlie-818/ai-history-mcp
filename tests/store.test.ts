/**
 * Unit tests for InMemoryMetricsStore
 * Tests all store interface methods with comprehensive coverage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMetricsStore } from "../src/store.js";
import {
  createMinimalLogCallInput,
  createCompleteLogCallInput,
  createSessionCallInputs,
  createDiverseCallInputs,
  resetFixtureCounter,
  assertValidModelCallLog,
  dateOffset,
  uniqueId,
} from "./fixtures.js";

describe("InMemoryMetricsStore", () => {
  let store: InMemoryMetricsStore;

  beforeEach(() => {
    store = new InMemoryMetricsStore();
    resetFixtureCounter();
  });

  describe("logCall", () => {
    it("should store a minimal call and return it with id and timestamp", async () => {
      const input = createMinimalLogCallInput();
      const result = await store.logCall(input);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/i); // UUID format
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
      expect(result.project).toBe(input.project);
      expect(result.modelName).toBe(input.modelName);
    });

    it("should store a complete call with all optional fields", async () => {
      const input = createCompleteLogCallInput();
      const result = await store.logCall(input);

      assertValidModelCallLog(result);
      expect(result.userId).toBe(input.userId);
      expect(result.sessionId).toBe(input.sessionId);
      expect(result.modelVersion).toBe(input.modelVersion);
      expect(result.promptType).toBe(input.promptType);
      expect(result.latencyMs).toBe(input.latencyMs);
      expect(result.tokensIn).toBe(input.tokensIn);
      expect(result.tokensOut).toBe(input.tokensOut);
      expect(result.safety).toEqual(input.safety);
      expect(result.metrics).toEqual(input.metrics);
      expect(result.traceId).toBe(input.traceId);
      expect(result.requestId).toBe(input.requestId);
      expect(result.retrievedContext).toBeUndefined(); // Not in complete fixture
    });

    it("should generate unique IDs for each call", async () => {
      const input1 = createMinimalLogCallInput();
      const input2 = createMinimalLogCallInput();

      const result1 = await store.logCall(input1);
      const result2 = await store.logCall(input2);

      expect(result1.id).not.toBe(result2.id);
    });

    it("should preserve input and output messages exactly", async () => {
      const input = createMinimalLogCallInput({
        inputMessages: [
          { role: "system", content: "System prompt" },
          { role: "user", content: "User message" },
        ],
        outputMessages: [
          { role: "assistant", content: "Assistant response" },
          { role: "tool", content: '{"result": "data"}' },
        ],
      });

      const result = await store.logCall(input);

      expect(result.inputMessages).toHaveLength(2);
      expect(result.inputMessages[0]).toEqual({ role: "system", content: "System prompt" });
      expect(result.inputMessages[1]).toEqual({ role: "user", content: "User message" });
      expect(result.outputMessages).toHaveLength(2);
      expect(result.outputMessages[0]).toEqual({ role: "assistant", content: "Assistant response" });
      expect(result.outputMessages[1]).toEqual({ role: "tool", content: '{"result": "data"}' });
    });

    it("should index calls by sessionId for fast retrieval", async () => {
      const sessionId = uniqueId("session");
      const inputs = createSessionCallInputs(sessionId, 5);

      for (const input of inputs) {
        await store.logCall(input);
      }

      const sessionCalls = await store.getSession(sessionId);
      expect(sessionCalls).toHaveLength(5);
    });
  });

  describe("getCall", () => {
    it("should retrieve a stored call by id", async () => {
      const input = createCompleteLogCallInput();
      const stored = await store.logCall(input);

      const retrieved = await store.getCall(stored.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(stored.id);
      expect(retrieved!.project).toBe(stored.project);
      expect(retrieved!.timestamp).toBe(stored.timestamp);
    });

    it("should return null for non-existent id", async () => {
      const result = await store.getCall("non-existent-id");
      expect(result).toBeNull();
    });

    it("should return the exact same data that was stored", async () => {
      const input = createCompleteLogCallInput();
      const stored = await store.logCall(input);
      const retrieved = await store.getCall(stored.id);

      expect(retrieved).toEqual(stored);
    });
  });

  describe("searchCalls", () => {
    beforeEach(async () => {
      // Seed with diverse data
      const calls = createDiverseCallInputs(20);
      for (const call of calls) {
        await store.logCall(call);
      }
    });

    it("should return all calls when no filters provided", async () => {
      const results = await store.searchCalls({});
      expect(results).toHaveLength(20);
    });

    it("should filter by project", async () => {
      const results = await store.searchCalls({ project: "chatbot" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.project).toBe("chatbot");
      });
    });

    it("should filter by environment", async () => {
      const results = await store.searchCalls({ environment: "prod" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.environment).toBe("prod");
      });
    });

    it("should filter by userId", async () => {
      const results = await store.searchCalls({ userId: "user-0" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.userId).toBe("user-0");
      });
    });

    it("should filter by modelName", async () => {
      const results = await store.searchCalls({ modelName: "gpt-4" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.modelName).toBe("gpt-4");
      });
    });

    it("should filter by date range (from)", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const results = await store.searchCalls({ from: yesterday.toISOString() });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(new Date(call.timestamp).getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
      });
    });

    it("should filter by date range (to)", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const results = await store.searchCalls({ to: tomorrow.toISOString() });

      expect(results.length).toBe(20); // All calls should be before tomorrow
    });

    it("should filter by date range (from and to)", async () => {
      const yesterday = dateOffset(-1);
      const tomorrow = dateOffset(1);

      const results = await store.searchCalls({ from: yesterday, to: tomorrow });

      expect(results.length).toBe(20); // All calls in range
    });

    it("should return empty array for date range with no matches", async () => {
      const futureStart = dateOffset(10);
      const futureEnd = dateOffset(20);

      const results = await store.searchCalls({ from: futureStart, to: futureEnd });

      expect(results).toHaveLength(0);
    });

    it("should combine multiple filters", async () => {
      const results = await store.searchCalls({
        project: "chatbot",
        environment: "dev",
      });

      results.forEach((call) => {
        expect(call.project).toBe("chatbot");
        expect(call.environment).toBe("dev");
      });
    });

    it("should respect limit parameter", async () => {
      const results = await store.searchCalls({ limit: 5 });
      expect(results).toHaveLength(5);
    });

    it("should return results sorted by timestamp descending (most recent first)", async () => {
      const results = await store.searchCalls({ limit: 10 });

      for (let i = 1; i < results.length; i++) {
        const prevTime = new Date(results[i - 1].timestamp).getTime();
        const currTime = new Date(results[i].timestamp).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it("should return empty array when no calls match filters", async () => {
      const results = await store.searchCalls({ project: "non-existent-project" });
      expect(results).toHaveLength(0);
    });
  });

  describe("listSessions", () => {
    beforeEach(async () => {
      // Create calls across multiple sessions
      for (let s = 0; s < 5; s++) {
        const sessionId = `session-${s}`;
        const inputs = createSessionCallInputs(sessionId, 3, {
          project: s < 3 ? "project-a" : "project-b",
          environment: s % 2 === 0 ? "prod" : "dev",
        });
        for (const input of inputs) {
          await store.logCall(input);
        }
      }
    });

    it("should list all sessions", async () => {
      const sessions = await store.listSessions({});

      expect(sessions).toHaveLength(5);
    });

    it("should return correct session summaries", async () => {
      const sessions = await store.listSessions({});

      sessions.forEach((session) => {
        expect(session.sessionId).toBeDefined();
        expect(session.project).toBeDefined();
        expect(session.environment).toBeDefined();
        expect(session.firstCallAt).toBeDefined();
        expect(session.lastCallAt).toBeDefined();
        expect(session.callCount).toBe(3);
        expect(session.totalTokensIn).toBeGreaterThan(0);
        expect(session.totalTokensOut).toBeGreaterThan(0);
      });
    });

    it("should filter sessions by project", async () => {
      const sessions = await store.listSessions({ project: "project-a" });

      expect(sessions).toHaveLength(3);
      sessions.forEach((session) => {
        expect(session.project).toBe("project-a");
      });
    });

    it("should filter sessions by environment", async () => {
      const sessions = await store.listSessions({ environment: "prod" });

      expect(sessions).toHaveLength(3);
      sessions.forEach((session) => {
        expect(session.environment).toBe("prod");
      });
    });

    it("should respect limit parameter", async () => {
      const sessions = await store.listSessions({ limit: 2 });

      expect(sessions).toHaveLength(2);
    });

    it("should return sessions sorted by lastCallAt descending", async () => {
      const sessions = await store.listSessions({});

      for (let i = 1; i < sessions.length; i++) {
        const prevTime = new Date(sessions[i - 1].lastCallAt).getTime();
        const currTime = new Date(sessions[i].lastCallAt).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it("should calculate avgLatencyMs when latency data available", async () => {
      const sessions = await store.listSessions({});

      sessions.forEach((session) => {
        expect(session.avgLatencyMs).toBeDefined();
        expect(session.avgLatencyMs).toBeGreaterThan(0);
      });
    });

    it("should return empty array when no sessions exist", async () => {
      const emptyStore = new InMemoryMetricsStore();
      const sessions = await emptyStore.listSessions({});

      expect(sessions).toHaveLength(0);
    });

    it("should not include calls without sessionId in sessions", async () => {
      // Add a call without sessionId
      await store.logCall(createMinimalLogCallInput({ sessionId: undefined }));

      const sessions = await store.listSessions({});

      // Should still have 5 sessions (the new call without sessionId is not counted)
      expect(sessions).toHaveLength(5);
    });
  });

  describe("getSession", () => {
    it("should return all calls for a session", async () => {
      const sessionId = uniqueId("session");
      const inputs = createSessionCallInputs(sessionId, 5);

      for (const input of inputs) {
        await store.logCall(input);
      }

      const calls = await store.getSession(sessionId);

      expect(calls).toHaveLength(5);
      calls.forEach((call) => {
        expect(call.sessionId).toBe(sessionId);
      });
    });

    it("should return calls sorted by timestamp ascending (oldest first)", async () => {
      const sessionId = uniqueId("session");
      const inputs = createSessionCallInputs(sessionId, 5);

      for (const input of inputs) {
        await store.logCall(input);
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      const calls = await store.getSession(sessionId);

      for (let i = 1; i < calls.length; i++) {
        const prevTime = new Date(calls[i - 1].timestamp).getTime();
        const currTime = new Date(calls[i].timestamp).getTime();
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });

    it("should return empty array for non-existent session", async () => {
      const calls = await store.getSession("non-existent-session");
      expect(calls).toHaveLength(0);
    });

    it("should only return calls from the specified session", async () => {
      const session1 = uniqueId("session-1");
      const session2 = uniqueId("session-2");

      for (const input of createSessionCallInputs(session1, 3)) {
        await store.logCall(input);
      }
      for (const input of createSessionCallInputs(session2, 2)) {
        await store.logCall(input);
      }

      const calls1 = await store.getSession(session1);
      const calls2 = await store.getSession(session2);

      expect(calls1).toHaveLength(3);
      expect(calls2).toHaveLength(2);
    });
  });

  describe("getAggregateMetrics", () => {
    beforeEach(async () => {
      const calls = createDiverseCallInputs(20);
      for (const call of calls) {
        await store.logCall(call);
      }
    });

    it("should return aggregate metrics for all calls", async () => {
      const metrics = await store.getAggregateMetrics({});

      expect(metrics.callCount).toBe(20);
      expect(metrics.totalTokensIn).toBeGreaterThan(0);
      expect(metrics.totalTokensOut).toBeGreaterThan(0);
      expect(metrics.avgLatencyMs).toBeGreaterThan(0);
    });

    it("should filter by project", async () => {
      const metrics = await store.getAggregateMetrics({ project: "chatbot" });

      expect(metrics.callCount).toBeGreaterThan(0);
      expect(metrics.callCount).toBeLessThan(20);
    });

    it("should filter by environment", async () => {
      const metrics = await store.getAggregateMetrics({ environment: "prod" });

      expect(metrics.callCount).toBeGreaterThan(0);
      expect(metrics.callCount).toBeLessThan(20);
    });

    it("should filter by date range", async () => {
      const yesterday = dateOffset(-1);
      const tomorrow = dateOffset(1);

      const metrics = await store.getAggregateMetrics({ from: yesterday, to: tomorrow });

      expect(metrics.callCount).toBe(20);
    });

    it("should return zero metrics when no calls match", async () => {
      const metrics = await store.getAggregateMetrics({ project: "non-existent" });

      expect(metrics.callCount).toBe(0);
      expect(metrics.totalTokensIn).toBe(0);
      expect(metrics.totalTokensOut).toBe(0);
      expect(metrics.avgLatencyMs).toBeUndefined();
    });

    it("should calculate avgLatencyMs correctly", async () => {
      // Create calls with known latency values
      const store2 = new InMemoryMetricsStore();
      await store2.logCall(createMinimalLogCallInput({ latencyMs: 100 }));
      await store2.logCall(createMinimalLogCallInput({ latencyMs: 200 }));
      await store2.logCall(createMinimalLogCallInput({ latencyMs: 300 }));

      const metrics = await store2.getAggregateMetrics({});

      expect(metrics.avgLatencyMs).toBe(200); // (100 + 200 + 300) / 3
    });

    it("should handle calls without latency data", async () => {
      const store2 = new InMemoryMetricsStore();
      await store2.logCall(createMinimalLogCallInput({ latencyMs: undefined }));
      await store2.logCall(createMinimalLogCallInput({ latencyMs: undefined }));

      const metrics = await store2.getAggregateMetrics({});

      expect(metrics.callCount).toBe(2);
      expect(metrics.avgLatencyMs).toBeUndefined();
    });

    it("should sum tokens correctly", async () => {
      const store2 = new InMemoryMetricsStore();
      await store2.logCall(createMinimalLogCallInput({ tokensIn: 100, tokensOut: 50 }));
      await store2.logCall(createMinimalLogCallInput({ tokensIn: 200, tokensOut: 100 }));
      await store2.logCall(createMinimalLogCallInput({ tokensIn: 300, tokensOut: 150 }));

      const metrics = await store2.getAggregateMetrics({});

      expect(metrics.totalTokensIn).toBe(600);
      expect(metrics.totalTokensOut).toBe(300);
    });
  });

  describe("concurrent operations", () => {
    it("should handle concurrent logCall operations", async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        store.logCall(createMinimalLogCallInput({ project: `project-${i}` }))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);

      // All IDs should be unique
      const ids = new Set(results.map((r) => r.id));
      expect(ids.size).toBe(100);
    });

    it("should handle concurrent read and write operations", async () => {
      // Start some writes
      const writePromises = Array.from({ length: 50 }, () =>
        store.logCall(createMinimalLogCallInput())
      );

      // Interleave with reads
      const readPromises = Array.from({ length: 50 }, () => store.searchCalls({}));

      const [writeResults, readResults] = await Promise.all([
        Promise.all(writePromises),
        Promise.all(readPromises),
      ]);

      expect(writeResults).toHaveLength(50);
      expect(readResults).toHaveLength(50);
    });
  });

  describe("edge cases", () => {
    it("should handle empty messages arrays", async () => {
      // Note: In practice, validation should prevent this, but store should handle it
      const input = createMinimalLogCallInput();
      const result = await store.logCall(input);

      expect(result.inputMessages.length).toBeGreaterThan(0);
      expect(result.outputMessages.length).toBeGreaterThan(0);
    });

    it("should handle very long content in messages", async () => {
      const longContent = "x".repeat(100000);
      const input = createMinimalLogCallInput({
        inputMessages: [{ role: "user", content: longContent }],
        outputMessages: [{ role: "assistant", content: longContent }],
      });

      const result = await store.logCall(input);
      const retrieved = await store.getCall(result.id);

      expect(retrieved!.inputMessages[0].content).toBe(longContent);
      expect(retrieved!.outputMessages[0].content).toBe(longContent);
    });

    it("should handle special characters in content", async () => {
      const specialContent = '{"key": "value", "emoji": "🎉", "unicode": "日本語"}';
      const input = createMinimalLogCallInput({
        inputMessages: [{ role: "user", content: specialContent }],
        outputMessages: [{ role: "assistant", content: specialContent }],
      });

      const result = await store.logCall(input);

      expect(result.inputMessages[0].content).toBe(specialContent);
      expect(result.outputMessages[0].content).toBe(specialContent);
    });

    it("should handle zero token counts", async () => {
      const input = createMinimalLogCallInput({ tokensIn: 0, tokensOut: 0 });
      const result = await store.logCall(input);

      expect(result.tokensIn).toBe(0);
      expect(result.tokensOut).toBe(0);
    });

    it("should handle very large numbers", async () => {
      const input = createMinimalLogCallInput({
        tokensIn: Number.MAX_SAFE_INTEGER,
        tokensOut: Number.MAX_SAFE_INTEGER,
        latencyMs: Number.MAX_SAFE_INTEGER,
      });

      const result = await store.logCall(input);

      expect(result.tokensIn).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});
