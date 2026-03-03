/**
 * Unit tests for search_model_calls tool
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ZodError } from "zod";
import { InMemoryMetricsStore } from "../../src/store.js";
import {
  createSearchModelCallsTool,
  searchModelCallsInputSchema,
} from "../../src/tools/search-model-calls.js";
import {
  createMinimalLogCallInput,
  createDiverseCallInputs,
  resetFixtureCounter,
  dateOffset,
} from "../fixtures.js";

describe("search_model_calls tool", () => {
  let store: InMemoryMetricsStore;
  let searchModelCalls: ReturnType<typeof createSearchModelCallsTool>;

  beforeEach(async () => {
    store = new InMemoryMetricsStore();
    searchModelCalls = createSearchModelCallsTool(store);
    resetFixtureCounter();

    // Seed with diverse data
    const calls = createDiverseCallInputs(30);
    for (const call of calls) {
      await store.logCall(call);
    }
  });

  describe("input validation", () => {
    it("should accept empty input (no filters)", () => {
      const result = searchModelCallsInputSchema.parse({});
      expect(result).toBeDefined();
      expect(result.limit).toBe(50); // default
    });

    it("should accept all valid filter parameters", () => {
      const input = {
        project: "test-project",
        environment: "prod",
        userId: "user-123",
        modelName: "gpt-4",
        from: "2024-01-01T00:00:00Z",
        to: "2024-12-31T23:59:59Z",
        limit: 25,
      };

      const result = searchModelCallsInputSchema.parse(input);

      expect(result.project).toBe("test-project");
      expect(result.environment).toBe("prod");
      expect(result.userId).toBe("user-123");
      expect(result.modelName).toBe("gpt-4");
      expect(result.from).toBe("2024-01-01T00:00:00Z");
      expect(result.to).toBe("2024-12-31T23:59:59Z");
      expect(result.limit).toBe(25);
    });

    it("should reject limit of zero", () => {
      const input = { limit: 0 };
      expect(() => searchModelCallsInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject negative limit", () => {
      const input = { limit: -10 };
      expect(() => searchModelCallsInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject limit exceeding maximum", () => {
      const input = { limit: 101 };
      expect(() => searchModelCallsInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should accept limit at maximum boundary", () => {
      const result = searchModelCallsInputSchema.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it("should apply default limit when not specified", () => {
      const result = searchModelCallsInputSchema.parse({});
      expect(result.limit).toBe(50);
    });
  });

  describe("tool execution", () => {
    it("should return all calls when no filters specified", async () => {
      const results = await searchModelCalls({});
      expect(results).toHaveLength(30);
    });

    it("should filter by project", async () => {
      const results = await searchModelCalls({ project: "chatbot" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.project).toBe("chatbot");
      });
    });

    it("should filter by environment", async () => {
      const results = await searchModelCalls({ environment: "prod" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.environment).toBe("prod");
      });
    });

    it("should filter by userId", async () => {
      const results = await searchModelCalls({ userId: "user-0" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.userId).toBe("user-0");
      });
    });

    it("should filter by modelName", async () => {
      const results = await searchModelCalls({ modelName: "claude-3-opus" });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((call) => {
        expect(call.modelName).toBe("claude-3-opus");
      });
    });

    it("should filter by date range (from)", async () => {
      const yesterday = dateOffset(-1);
      const results = await searchModelCalls({ from: yesterday });

      expect(results.length).toBe(30); // All calls should be after yesterday
    });

    it("should filter by date range (to)", async () => {
      const tomorrow = dateOffset(1);
      const results = await searchModelCalls({ to: tomorrow });

      expect(results.length).toBe(30); // All calls should be before tomorrow
    });

    it("should filter by date range (from and to)", async () => {
      const yesterday = dateOffset(-1);
      const tomorrow = dateOffset(1);

      const results = await searchModelCalls({
        from: yesterday,
        to: tomorrow,
      });

      expect(results.length).toBe(30);
    });

    it("should return empty when date range has no matches", async () => {
      const futureStart = dateOffset(100);
      const futureEnd = dateOffset(200);

      const results = await searchModelCalls({
        from: futureStart,
        to: futureEnd,
      });

      expect(results).toHaveLength(0);
    });

    it("should combine multiple filters (AND logic)", async () => {
      const results = await searchModelCalls({
        project: "chatbot",
        environment: "dev",
      });

      results.forEach((call) => {
        expect(call.project).toBe("chatbot");
        expect(call.environment).toBe("dev");
      });
    });

    it("should respect limit parameter", async () => {
      const results = await searchModelCalls({ limit: 5 });
      expect(results).toHaveLength(5);
    });

    it("should return results sorted by timestamp descending", async () => {
      const results = await searchModelCalls({ limit: 10 });

      for (let i = 1; i < results.length; i++) {
        const prevTime = new Date(results[i - 1].timestamp).getTime();
        const currTime = new Date(results[i].timestamp).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it("should return empty array when no calls match", async () => {
      const results = await searchModelCalls({
        project: "non-existent-project",
      });
      expect(results).toHaveLength(0);
    });
  });

  describe("content truncation", () => {
    it("should truncate long message content", async () => {
      // Add a call with very long content
      const longContent = "x".repeat(1000);
      await store.logCall(
        createMinimalLogCallInput({
          project: "truncation-test",
          inputMessages: [{ role: "user", content: longContent }],
          outputMessages: [{ role: "assistant", content: longContent }],
        })
      );

      const results = await searchModelCalls({ project: "truncation-test" });

      expect(results).toHaveLength(1);
      expect(results[0].inputMessages[0].content.length).toBeLessThan(longContent.length);
      expect(results[0].inputMessages[0].content).toContain("...[truncated]");
      expect(results[0].outputMessages[0].content).toContain("...[truncated]");
    });

    it("should not truncate short content", async () => {
      const shortContent = "Hello, world!";
      await store.logCall(
        createMinimalLogCallInput({
          project: "no-truncation-test",
          inputMessages: [{ role: "user", content: shortContent }],
          outputMessages: [{ role: "assistant", content: shortContent }],
        })
      );

      const results = await searchModelCalls({ project: "no-truncation-test" });

      expect(results).toHaveLength(1);
      expect(results[0].inputMessages[0].content).toBe(shortContent);
      expect(results[0].outputMessages[0].content).toBe(shortContent);
    });

    it("should truncate at exactly the max length boundary", async () => {
      const maxLength = 500;
      const exactContent = "x".repeat(maxLength);
      const overContent = "x".repeat(maxLength + 1);

      await store.logCall(
        createMinimalLogCallInput({
          project: "boundary-test-exact",
          inputMessages: [{ role: "user", content: exactContent }],
          outputMessages: [{ role: "assistant", content: exactContent }],
        })
      );

      await store.logCall(
        createMinimalLogCallInput({
          project: "boundary-test-over",
          inputMessages: [{ role: "user", content: overContent }],
          outputMessages: [{ role: "assistant", content: overContent }],
        })
      );

      const exactResults = await searchModelCalls({ project: "boundary-test-exact" });
      const overResults = await searchModelCalls({ project: "boundary-test-over" });

      expect(exactResults[0].inputMessages[0].content).toBe(exactContent);
      expect(overResults[0].inputMessages[0].content).toContain("...[truncated]");
    });
  });

  describe("result completeness", () => {
    it("should include all expected fields in results", async () => {
      const results = await searchModelCalls({ limit: 1 });

      const call = results[0];
      expect(call.id).toBeDefined();
      expect(call.timestamp).toBeDefined();
      expect(call.project).toBeDefined();
      expect(call.environment).toBeDefined();
      expect(call.modelName).toBeDefined();
      expect(call.inputMessages).toBeDefined();
      expect(call.outputMessages).toBeDefined();
    });

    it("should preserve optional fields when present", async () => {
      await store.logCall(
        createMinimalLogCallInput({
          project: "optional-fields-test",
          userId: "test-user",
          sessionId: "test-session",
          tokensIn: 100,
          tokensOut: 50,
          latencyMs: 250,
        })
      );

      const results = await searchModelCalls({ project: "optional-fields-test" });

      expect(results[0].userId).toBe("test-user");
      expect(results[0].sessionId).toBe("test-session");
      expect(results[0].tokensIn).toBe(100);
      expect(results[0].tokensOut).toBe(50);
      expect(results[0].latencyMs).toBe(250);
    });
  });

  describe("edge cases", () => {
    it("should handle empty store gracefully", async () => {
      const emptyStore = new InMemoryMetricsStore();
      const emptySearch = createSearchModelCallsTool(emptyStore);

      const results = await emptySearch({});
      expect(results).toHaveLength(0);
    });

    it("should handle filters with special characters in values", async () => {
      await store.logCall(
        createMinimalLogCallInput({
          project: "project/with/slashes",
          userId: "user@example.com",
        })
      );

      const projectResults = await searchModelCalls({
        project: "project/with/slashes",
      });
      const userResults = await searchModelCalls({ userId: "user@example.com" });

      expect(projectResults).toHaveLength(1);
      expect(userResults).toHaveLength(1);
    });

    it("should handle ISO date strings with timezone", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const results = await searchModelCalls({
        from: yesterday,
        to: tomorrow,
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
