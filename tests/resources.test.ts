/**
 * Unit tests for MCP resource handlers
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMetricsStore } from "../src/store.js";
import { createResourceHandlers } from "../src/resources/index.js";
import {
  createMinimalLogCallInput,
  createSessionCallInputs,
  resetFixtureCounter,
  uniqueId,
  dateOffset,
} from "./fixtures.js";

describe("Resource Handlers", () => {
  let store: InMemoryMetricsStore;
  let resourceHandlers: ReturnType<typeof createResourceHandlers>;

  beforeEach(() => {
    store = new InMemoryMetricsStore();
    resourceHandlers = createResourceHandlers(store);
    resetFixtureCounter();
  });

  describe("getCall resource", () => {
    it("should retrieve a call by id", async () => {
      const loggedCall = await store.logCall(createMinimalLogCallInput());

      const result = await resourceHandlers.getCall(loggedCall.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(loggedCall.id);
      expect(result!.project).toBe(loggedCall.project);
    });

    it("should return null for non-existent id", async () => {
      const result = await resourceHandlers.getCall("non-existent-id");
      expect(result).toBeNull();
    });

    it("should return complete call data", async () => {
      const input = createMinimalLogCallInput({
        project: "test-project",
        environment: "prod",
        userId: "user-123",
        modelName: "gpt-4",
        tokensIn: 100,
        tokensOut: 50,
        latencyMs: 250,
      });

      const loggedCall = await store.logCall(input);
      const result = await resourceHandlers.getCall(loggedCall.id);

      expect(result).not.toBeNull();
      expect(result!.project).toBe("test-project");
      expect(result!.environment).toBe("prod");
      expect(result!.userId).toBe("user-123");
      expect(result!.modelName).toBe("gpt-4");
      expect(result!.tokensIn).toBe(100);
      expect(result!.tokensOut).toBe(50);
      expect(result!.latencyMs).toBe(250);
    });

    it("should handle UUID format ids", async () => {
      const loggedCall = await store.logCall(createMinimalLogCallInput());

      // The store generates UUID format ids
      expect(loggedCall.id).toMatch(/^[0-9a-f-]{36}$/i);

      const result = await resourceHandlers.getCall(loggedCall.id);
      expect(result).not.toBeNull();
    });
  });

  describe("getSession resource", () => {
    it("should retrieve session with summary and calls", async () => {
      const sessionId = uniqueId("session");
      const inputs = createSessionCallInputs(sessionId, 5, {
        project: "test-project",
        environment: "prod",
      });

      for (const input of inputs) {
        await store.logCall(input);
      }

      const result = await resourceHandlers.getSession(sessionId);

      expect(result.session).not.toBeNull();
      expect(result.calls).toHaveLength(5);
    });

    it("should return correct session summary", async () => {
      const sessionId = uniqueId("session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId,
          project: "summary-project",
          environment: "staging",
          tokensIn: 100,
          tokensOut: 50,
          latencyMs: 200,
        })
      );
      await store.logCall(
        createMinimalLogCallInput({
          sessionId,
          project: "summary-project",
          environment: "staging",
          tokensIn: 200,
          tokensOut: 100,
          latencyMs: 300,
        })
      );

      const result = await resourceHandlers.getSession(sessionId);

      expect(result.session).not.toBeNull();
      expect(result.session!.sessionId).toBe(sessionId);
      expect(result.session!.project).toBe("summary-project");
      expect(result.session!.environment).toBe("staging");
      expect(result.session!.callCount).toBe(2);
      expect(result.session!.totalTokensIn).toBe(300);
      expect(result.session!.totalTokensOut).toBe(150);
      expect(result.session!.avgLatencyMs).toBe(250);
    });

    it("should return null session for non-existent sessionId", async () => {
      const result = await resourceHandlers.getSession("non-existent-session");

      expect(result.session).toBeNull();
      expect(result.calls).toHaveLength(0);
    });

    it("should return calls sorted by timestamp (oldest first)", async () => {
      const sessionId = uniqueId("session");

      for (let i = 0; i < 5; i++) {
        await store.logCall(
          createMinimalLogCallInput({
            sessionId,
            inputMessages: [{ role: "user", content: `Message ${i}` }],
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const result = await resourceHandlers.getSession(sessionId);

      for (let i = 1; i < result.calls.length; i++) {
        const prevTime = new Date(result.calls[i - 1].timestamp).getTime();
        const currTime = new Date(result.calls[i].timestamp).getTime();
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });

    it("should include firstCallAt and lastCallAt in summary", async () => {
      const sessionId = uniqueId("session");

      await store.logCall(createMinimalLogCallInput({ sessionId }));
      await new Promise((resolve) => setTimeout(resolve, 10));
      await store.logCall(createMinimalLogCallInput({ sessionId }));

      const result = await resourceHandlers.getSession(sessionId);

      expect(result.session!.firstCallAt).toBeDefined();
      expect(result.session!.lastCallAt).toBeDefined();
      expect(new Date(result.session!.lastCallAt).getTime()).toBeGreaterThanOrEqual(
        new Date(result.session!.firstCallAt).getTime()
      );
    });
  });

  describe("getAggregateMetrics resource", () => {
    beforeEach(async () => {
      // Seed with known data
      for (let i = 0; i < 10; i++) {
        await store.logCall(
          createMinimalLogCallInput({
            project: i < 5 ? "project-a" : "project-b",
            environment: i % 2 === 0 ? "prod" : "dev",
            tokensIn: 100,
            tokensOut: 50,
            latencyMs: 200,
          })
        );
      }
    });

    it("should return aggregate metrics without filters", async () => {
      const result = await resourceHandlers.getAggregateMetrics("");

      expect(result.callCount).toBe(10);
      expect(result.totalTokensIn).toBe(1000);
      expect(result.totalTokensOut).toBe(500);
      expect(result.avgLatencyMs).toBe(200);
    });

    it("should parse and apply project filter", async () => {
      const result = await resourceHandlers.getAggregateMetrics("project=project-a");

      expect(result.callCount).toBe(5);
      expect(result.totalTokensIn).toBe(500);
    });

    it("should parse and apply environment filter", async () => {
      const result = await resourceHandlers.getAggregateMetrics("environment=prod");

      expect(result.callCount).toBe(5);
    });

    it("should parse and apply multiple filters", async () => {
      const result = await resourceHandlers.getAggregateMetrics(
        "project=project-a&environment=prod"
      );

      expect(result.callCount).toBeLessThanOrEqual(5);
    });

    it("should parse date range filters", async () => {
      const yesterday = dateOffset(-1);
      const tomorrow = dateOffset(1);

      const result = await resourceHandlers.getAggregateMetrics(
        `from=${encodeURIComponent(yesterday)}&to=${encodeURIComponent(tomorrow)}`
      );

      expect(result.callCount).toBe(10);
    });

    it("should handle empty query string", async () => {
      const result = await resourceHandlers.getAggregateMetrics("");

      expect(result.callCount).toBe(10);
    });

    it("should handle URL-encoded parameter values", async () => {
      await store.logCall(
        createMinimalLogCallInput({
          project: "project/with/slashes",
        })
      );

      const result = await resourceHandlers.getAggregateMetrics(
        `project=${encodeURIComponent("project/with/slashes")}`
      );

      expect(result.callCount).toBe(1);
    });

    it("should return zero metrics when no calls match", async () => {
      const result = await resourceHandlers.getAggregateMetrics("project=non-existent");

      expect(result.callCount).toBe(0);
      expect(result.totalTokensIn).toBe(0);
      expect(result.totalTokensOut).toBe(0);
      expect(result.avgLatencyMs).toBeUndefined();
    });
  });

  describe("query string parsing", () => {
    it("should handle missing values in query string", async () => {
      const result = await resourceHandlers.getAggregateMetrics("project=&environment=prod");

      // Should still work, treating empty project as no filter
      expect(result).toBeDefined();
    });

    it("should handle query string with only keys", async () => {
      const result = await resourceHandlers.getAggregateMetrics("project");

      expect(result).toBeDefined();
    });

    it("should handle malformed query string gracefully", async () => {
      const testCases = [
        "=value",
        "&&",
        "key=value&",
        "&key=value",
        "key==value",
      ];

      for (const queryString of testCases) {
        const result = await resourceHandlers.getAggregateMetrics(queryString);
        expect(result).toBeDefined();
      }
    });

    it("should handle special characters in decoded values", async () => {
      await store.logCall(
        createMinimalLogCallInput({
          project: "project with spaces",
        })
      );

      const result = await resourceHandlers.getAggregateMetrics(
        `project=${encodeURIComponent("project with spaces")}`
      );

      expect(result.callCount).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty store for all resources", async () => {
      const emptyStore = new InMemoryMetricsStore();
      const emptyHandlers = createResourceHandlers(emptyStore);

      const callResult = await emptyHandlers.getCall("any-id");
      const sessionResult = await emptyHandlers.getSession("any-session");
      const metricsResult = await emptyHandlers.getAggregateMetrics("");

      expect(callResult).toBeNull();
      expect(sessionResult.session).toBeNull();
      expect(sessionResult.calls).toHaveLength(0);
      expect(metricsResult.callCount).toBe(0);
    });

    it("should handle calls without optional fields", async () => {
      const loggedCall = await store.logCall(
        createMinimalLogCallInput({
          userId: undefined,
          sessionId: undefined,
          tokensIn: undefined,
          tokensOut: undefined,
          latencyMs: undefined,
        })
      );

      const result = await resourceHandlers.getCall(loggedCall.id);

      expect(result).not.toBeNull();
      expect(result!.userId).toBeUndefined();
      expect(result!.sessionId).toBeUndefined();
      expect(result!.tokensIn).toBeUndefined();
      expect(result!.tokensOut).toBeUndefined();
      expect(result!.latencyMs).toBeUndefined();
    });
  });
});
