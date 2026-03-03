/**
 * Unit tests for get_aggregate_metrics tool
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMetricsStore } from "../../src/store.js";
import {
  createGetAggregateMetricsTool,
  getAggregateMetricsInputSchema,
} from "../../src/tools/get-aggregate-metrics.js";
import {
  createMinimalLogCallInput,
  createDiverseCallInputs,
  resetFixtureCounter,
  dateOffset,
} from "../fixtures.js";

describe("get_aggregate_metrics tool", () => {
  let store: InMemoryMetricsStore;
  let getAggregateMetrics: ReturnType<typeof createGetAggregateMetricsTool>;

  beforeEach(async () => {
    store = new InMemoryMetricsStore();
    getAggregateMetrics = createGetAggregateMetricsTool(store);
    resetFixtureCounter();
  });

  describe("input validation", () => {
    it("should accept empty input (no filters)", () => {
      const result = getAggregateMetricsInputSchema.parse({});
      expect(result).toBeDefined();
    });

    it("should accept all valid filter parameters", () => {
      const input = {
        project: "test-project",
        environment: "prod",
        from: "2024-01-01T00:00:00Z",
        to: "2024-12-31T23:59:59Z",
      };

      const result = getAggregateMetricsInputSchema.parse(input);

      expect(result.project).toBe("test-project");
      expect(result.environment).toBe("prod");
      expect(result.from).toBe("2024-01-01T00:00:00Z");
      expect(result.to).toBe("2024-12-31T23:59:59Z");
    });

    it("should accept partial filters", () => {
      const inputs = [
        { project: "test-project" },
        { environment: "prod" },
        { from: "2024-01-01T00:00:00Z" },
        { to: "2024-12-31T23:59:59Z" },
        { project: "test", environment: "dev" },
        { from: "2024-01-01T00:00:00Z", to: "2024-12-31T23:59:59Z" },
      ];

      for (const input of inputs) {
        const result = getAggregateMetricsInputSchema.parse(input);
        expect(result).toBeDefined();
      }
    });

    it("should accept optional fields as undefined", () => {
      const result = getAggregateMetricsInputSchema.parse({
        project: undefined,
        environment: undefined,
        from: undefined,
        to: undefined,
      });

      expect(result.project).toBeUndefined();
      expect(result.environment).toBeUndefined();
      expect(result.from).toBeUndefined();
      expect(result.to).toBeUndefined();
    });
  });

  describe("tool execution - basic metrics", () => {
    beforeEach(async () => {
      // Seed with known data
      for (let i = 0; i < 10; i++) {
        await store.logCall(
          createMinimalLogCallInput({
            project: "test-project",
            environment: "prod",
            tokensIn: 100,
            tokensOut: 50,
            latencyMs: 200,
          })
        );
      }
    });

    it("should return correct callCount", async () => {
      const metrics = await getAggregateMetrics({});
      expect(metrics.callCount).toBe(10);
    });

    it("should return correct totalTokensIn", async () => {
      const metrics = await getAggregateMetrics({});
      expect(metrics.totalTokensIn).toBe(1000); // 10 * 100
    });

    it("should return correct totalTokensOut", async () => {
      const metrics = await getAggregateMetrics({});
      expect(metrics.totalTokensOut).toBe(500); // 10 * 50
    });

    it("should return correct avgLatencyMs", async () => {
      const metrics = await getAggregateMetrics({});
      expect(metrics.avgLatencyMs).toBe(200); // All calls have 200ms latency
    });
  });

  describe("tool execution - filtering", () => {
    beforeEach(async () => {
      // Seed with diverse data
      const calls = createDiverseCallInputs(30);
      for (const call of calls) {
        await store.logCall(call);
      }
    });

    it("should filter by project", async () => {
      const allMetrics = await getAggregateMetrics({});
      const filteredMetrics = await getAggregateMetrics({ project: "chatbot" });

      expect(filteredMetrics.callCount).toBeLessThan(allMetrics.callCount);
      expect(filteredMetrics.callCount).toBeGreaterThan(0);
    });

    it("should filter by environment", async () => {
      const allMetrics = await getAggregateMetrics({});
      const filteredMetrics = await getAggregateMetrics({ environment: "prod" });

      expect(filteredMetrics.callCount).toBeLessThan(allMetrics.callCount);
      expect(filteredMetrics.callCount).toBeGreaterThan(0);
    });

    it("should filter by date range (from)", async () => {
      const yesterday = dateOffset(-1);
      const metrics = await getAggregateMetrics({ from: yesterday });

      expect(metrics.callCount).toBe(30); // All calls should be after yesterday
    });

    it("should filter by date range (to)", async () => {
      const tomorrow = dateOffset(1);
      const metrics = await getAggregateMetrics({ to: tomorrow });

      expect(metrics.callCount).toBe(30); // All calls should be before tomorrow
    });

    it("should filter by date range (from and to)", async () => {
      const yesterday = dateOffset(-1);
      const tomorrow = dateOffset(1);

      const metrics = await getAggregateMetrics({ from: yesterday, to: tomorrow });

      expect(metrics.callCount).toBe(30);
    });

    it("should return zero counts when date range has no matches", async () => {
      const futureStart = dateOffset(100);
      const futureEnd = dateOffset(200);

      const metrics = await getAggregateMetrics({
        from: futureStart,
        to: futureEnd,
      });

      expect(metrics.callCount).toBe(0);
      expect(metrics.totalTokensIn).toBe(0);
      expect(metrics.totalTokensOut).toBe(0);
      expect(metrics.avgLatencyMs).toBeUndefined();
    });

    it("should combine multiple filters (AND logic)", async () => {
      const allMetrics = await getAggregateMetrics({});
      const filteredMetrics = await getAggregateMetrics({
        project: "chatbot",
        environment: "dev",
      });

      expect(filteredMetrics.callCount).toBeLessThanOrEqual(allMetrics.callCount);
    });

    it("should return zero metrics when no calls match filters", async () => {
      const metrics = await getAggregateMetrics({ project: "non-existent" });

      expect(metrics.callCount).toBe(0);
      expect(metrics.totalTokensIn).toBe(0);
      expect(metrics.totalTokensOut).toBe(0);
      expect(metrics.avgLatencyMs).toBeUndefined();
    });
  });

  describe("avgLatencyMs calculation", () => {
    it("should calculate average correctly with varying latencies", async () => {
      await store.logCall(createMinimalLogCallInput({ latencyMs: 100 }));
      await store.logCall(createMinimalLogCallInput({ latencyMs: 200 }));
      await store.logCall(createMinimalLogCallInput({ latencyMs: 300 }));
      await store.logCall(createMinimalLogCallInput({ latencyMs: 400 }));

      const metrics = await getAggregateMetrics({});

      expect(metrics.avgLatencyMs).toBe(250); // (100 + 200 + 300 + 400) / 4
    });

    it("should return undefined when no latency data available", async () => {
      await store.logCall(createMinimalLogCallInput({ latencyMs: undefined }));
      await store.logCall(createMinimalLogCallInput({ latencyMs: undefined }));

      const metrics = await getAggregateMetrics({});

      expect(metrics.callCount).toBe(2);
      expect(metrics.avgLatencyMs).toBeUndefined();
    });

    it("should calculate average only from calls with latency data", async () => {
      await store.logCall(createMinimalLogCallInput({ latencyMs: 100 }));
      await store.logCall(createMinimalLogCallInput({ latencyMs: undefined }));
      await store.logCall(createMinimalLogCallInput({ latencyMs: 200 }));
      await store.logCall(createMinimalLogCallInput({ latencyMs: undefined }));

      const metrics = await getAggregateMetrics({});

      expect(metrics.callCount).toBe(4);
      expect(metrics.avgLatencyMs).toBe(150); // (100 + 200) / 2
    });
  });

  describe("token aggregation", () => {
    it("should sum tokens correctly", async () => {
      await store.logCall(createMinimalLogCallInput({ tokensIn: 100, tokensOut: 50 }));
      await store.logCall(createMinimalLogCallInput({ tokensIn: 200, tokensOut: 100 }));
      await store.logCall(createMinimalLogCallInput({ tokensIn: 300, tokensOut: 150 }));

      const metrics = await getAggregateMetrics({});

      expect(metrics.totalTokensIn).toBe(600);
      expect(metrics.totalTokensOut).toBe(300);
    });

    it("should handle calls without token data", async () => {
      await store.logCall(createMinimalLogCallInput({ tokensIn: 100, tokensOut: 50 }));
      await store.logCall(createMinimalLogCallInput({ tokensIn: undefined, tokensOut: undefined }));
      await store.logCall(createMinimalLogCallInput({ tokensIn: 200, tokensOut: 100 }));

      const metrics = await getAggregateMetrics({});

      expect(metrics.callCount).toBe(3);
      expect(metrics.totalTokensIn).toBe(300);
      expect(metrics.totalTokensOut).toBe(150);
    });

    it("should handle zero token counts", async () => {
      await store.logCall(createMinimalLogCallInput({ tokensIn: 0, tokensOut: 0 }));
      await store.logCall(createMinimalLogCallInput({ tokensIn: 100, tokensOut: 50 }));

      const metrics = await getAggregateMetrics({});

      expect(metrics.totalTokensIn).toBe(100);
      expect(metrics.totalTokensOut).toBe(50);
    });

    it("should handle large token counts without overflow", async () => {
      const largeCount = 1000000000; // 1 billion

      await store.logCall(createMinimalLogCallInput({ tokensIn: largeCount, tokensOut: largeCount }));
      await store.logCall(createMinimalLogCallInput({ tokensIn: largeCount, tokensOut: largeCount }));

      const metrics = await getAggregateMetrics({});

      expect(metrics.totalTokensIn).toBe(2 * largeCount);
      expect(metrics.totalTokensOut).toBe(2 * largeCount);
    });
  });

  describe("edge cases", () => {
    it("should handle empty store gracefully", async () => {
      const metrics = await getAggregateMetrics({});

      expect(metrics.callCount).toBe(0);
      expect(metrics.totalTokensIn).toBe(0);
      expect(metrics.totalTokensOut).toBe(0);
      expect(metrics.avgLatencyMs).toBeUndefined();
    });

    it("should handle single call", async () => {
      await store.logCall(
        createMinimalLogCallInput({
          tokensIn: 100,
          tokensOut: 50,
          latencyMs: 200,
        })
      );

      const metrics = await getAggregateMetrics({});

      expect(metrics.callCount).toBe(1);
      expect(metrics.totalTokensIn).toBe(100);
      expect(metrics.totalTokensOut).toBe(50);
      expect(metrics.avgLatencyMs).toBe(200);
    });

    it("should handle very large number of calls", async () => {
      const callCount = 1000;

      for (let i = 0; i < callCount; i++) {
        await store.logCall(
          createMinimalLogCallInput({
            tokensIn: 10,
            tokensOut: 5,
            latencyMs: 100,
          })
        );
      }

      const metrics = await getAggregateMetrics({});

      expect(metrics.callCount).toBe(callCount);
      expect(metrics.totalTokensIn).toBe(callCount * 10);
      expect(metrics.totalTokensOut).toBe(callCount * 5);
      expect(metrics.avgLatencyMs).toBe(100);
    });

    it("should handle special characters in filter values", async () => {
      await store.logCall(
        createMinimalLogCallInput({
          project: "project/with/slashes",
          environment: "env-with-dashes",
        })
      );

      const metrics = await getAggregateMetrics({
        project: "project/with/slashes",
        environment: "env-with-dashes",
      });

      expect(metrics.callCount).toBe(1);
    });
  });

  describe("result structure", () => {
    it("should return all required fields", async () => {
      await store.logCall(createMinimalLogCallInput({ latencyMs: 100 }));

      const metrics = await getAggregateMetrics({});

      expect(metrics).toHaveProperty("callCount");
      expect(metrics).toHaveProperty("totalTokensIn");
      expect(metrics).toHaveProperty("totalTokensOut");
      expect(metrics).toHaveProperty("avgLatencyMs");

      expect(typeof metrics.callCount).toBe("number");
      expect(typeof metrics.totalTokensIn).toBe("number");
      expect(typeof metrics.totalTokensOut).toBe("number");
    });

    it("should return correct types for all fields", async () => {
      await store.logCall(
        createMinimalLogCallInput({
          tokensIn: 100,
          tokensOut: 50,
          latencyMs: 200,
        })
      );

      const metrics = await getAggregateMetrics({});

      expect(Number.isInteger(metrics.callCount)).toBe(true);
      expect(Number.isInteger(metrics.totalTokensIn)).toBe(true);
      expect(Number.isInteger(metrics.totalTokensOut)).toBe(true);
      expect(typeof metrics.avgLatencyMs).toBe("number");
    });
  });
});
