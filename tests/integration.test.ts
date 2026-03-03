/**
 * Integration tests for the AI Usage Metrics MCP Server
 * Tests end-to-end workflows and tool/resource interactions
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMetricsStore } from "../src/store.js";
import { createLogModelCallTool } from "../src/tools/log-model-call.js";
import { createSearchModelCallsTool } from "../src/tools/search-model-calls.js";
import { createListSessionsTool } from "../src/tools/list-sessions.js";
import { createGetSessionCallsTool } from "../src/tools/get-session-calls.js";
import { createGetAggregateMetricsTool } from "../src/tools/get-aggregate-metrics.js";
import { createResourceHandlers } from "../src/resources/index.js";
import {
  createMinimalLogCallInput,
  createCompleteLogCallInput,
  createRagLogCallInput,
  uniqueId,
  resetFixtureCounter,
} from "./fixtures.js";

describe("Integration Tests", () => {
  let store: InMemoryMetricsStore;
  let logModelCall: ReturnType<typeof createLogModelCallTool>;
  let searchModelCalls: ReturnType<typeof createSearchModelCallsTool>;
  let listSessions: ReturnType<typeof createListSessionsTool>;
  let getSessionCalls: ReturnType<typeof createGetSessionCallsTool>;
  let getAggregateMetrics: ReturnType<typeof createGetAggregateMetricsTool>;
  let resourceHandlers: ReturnType<typeof createResourceHandlers>;

  beforeEach(() => {
    store = new InMemoryMetricsStore();
    logModelCall = createLogModelCallTool(store);
    searchModelCalls = createSearchModelCallsTool(store);
    listSessions = createListSessionsTool(store);
    getSessionCalls = createGetSessionCallsTool(store);
    getAggregateMetrics = createGetAggregateMetricsTool(store);
    resourceHandlers = createResourceHandlers(store);
    resetFixtureCounter();
  });

  describe("Complete logging and retrieval workflow", () => {
    it("should log a call and retrieve it via search", async () => {
      const input = createMinimalLogCallInput({ project: "workflow-test" });
      const logResult = await logModelCall(input);

      const searchResults = await searchModelCalls({ project: "workflow-test" });

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe(logResult.id);
    });

    it("should log a call and retrieve it via resource", async () => {
      const input = createCompleteLogCallInput();
      const logResult = await logModelCall(input);

      const resourceResult = await resourceHandlers.getCall(logResult.id);

      expect(resourceResult).not.toBeNull();
      expect(resourceResult!.id).toBe(logResult.id);
      expect(resourceResult!.project).toBe(input.project);
    });

    it("should track session through multiple calls", async () => {
      const sessionId = uniqueId("integration-session");

      // Log multiple calls in the same session
      for (let i = 0; i < 5; i++) {
        await logModelCall(
          createMinimalLogCallInput({
            sessionId,
            project: "session-tracking",
            inputMessages: [{ role: "user", content: `Message ${i}` }],
            outputMessages: [{ role: "assistant", content: `Response ${i}` }],
            tokensIn: 10 + i,
            tokensOut: 20 + i,
            latencyMs: 100 + i * 10,
          })
        );
      }

      // Verify via list_sessions
      const sessions = await listSessions({ project: "session-tracking" });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe(sessionId);
      expect(sessions[0].callCount).toBe(5);

      // Verify via get_session_calls
      const sessionCalls = await getSessionCalls({ sessionId });
      expect(sessionCalls).toHaveLength(5);

      // Verify via resource
      const sessionResource = await resourceHandlers.getSession(sessionId);
      expect(sessionResource.session!.callCount).toBe(5);
      expect(sessionResource.calls).toHaveLength(5);
    });
  });

  describe("Aggregate metrics tracking", () => {
    it("should accurately aggregate metrics across calls", async () => {
      const calls = [
        { tokensIn: 100, tokensOut: 50, latencyMs: 200 },
        { tokensIn: 200, tokensOut: 100, latencyMs: 300 },
        { tokensIn: 150, tokensOut: 75, latencyMs: 250 },
      ];

      for (const call of calls) {
        await logModelCall(
          createMinimalLogCallInput({
            project: "aggregate-test",
            ...call,
          })
        );
      }

      const metrics = await getAggregateMetrics({ project: "aggregate-test" });

      expect(metrics.callCount).toBe(3);
      expect(metrics.totalTokensIn).toBe(450);
      expect(metrics.totalTokensOut).toBe(225);
      expect(metrics.avgLatencyMs).toBe(250);
    });

    it("should filter aggregates by project and environment", async () => {
      const configurations = [
        { project: "proj-a", environment: "prod" },
        { project: "proj-a", environment: "dev" },
        { project: "proj-b", environment: "prod" },
      ];

      for (const config of configurations) {
        for (let i = 0; i < 3; i++) {
          await logModelCall(createMinimalLogCallInput(config));
        }
      }

      const allMetrics = await getAggregateMetrics({});
      const projAMetrics = await getAggregateMetrics({ project: "proj-a" });
      const prodMetrics = await getAggregateMetrics({ environment: "prod" });
      const projAProdMetrics = await getAggregateMetrics({
        project: "proj-a",
        environment: "prod",
      });

      expect(allMetrics.callCount).toBe(9);
      expect(projAMetrics.callCount).toBe(6);
      expect(prodMetrics.callCount).toBe(6);
      expect(projAProdMetrics.callCount).toBe(3);
    });
  });

  describe("Multi-model tracking", () => {
    it("should track usage across different models", async () => {
      const models = ["gpt-4", "claude-3-opus", "gpt-3.5-turbo", "claude-3-sonnet"];

      for (const modelName of models) {
        for (let i = 0; i < 3; i++) {
          await logModelCall(
            createMinimalLogCallInput({
              project: "multi-model",
              modelName,
            })
          );
        }
      }

      // Search by model
      for (const modelName of models) {
        const results = await searchModelCalls({
          project: "multi-model",
          modelName,
        });
        expect(results).toHaveLength(3);
        results.forEach((call) => expect(call.modelName).toBe(modelName));
      }

      // Total should be all models combined
      const allResults = await searchModelCalls({ project: "multi-model" });
      expect(allResults).toHaveLength(12);
    });
  });

  describe("User tracking", () => {
    it("should track calls by user across sessions", async () => {
      const users = ["user-1", "user-2", "user-3"];

      for (const userId of users) {
        for (let session = 0; session < 2; session++) {
          const sessionId = `${userId}-session-${session}`;
          for (let call = 0; call < 3; call++) {
            await logModelCall(
              createMinimalLogCallInput({
                project: "user-tracking",
                userId,
                sessionId,
              })
            );
          }
        }
      }

      // Verify user filtering
      for (const userId of users) {
        const userCalls = await searchModelCalls({
          project: "user-tracking",
          userId,
        });
        expect(userCalls).toHaveLength(6); // 2 sessions * 3 calls
      }

      // Verify session listing shows sessions across users
      const sessions = await listSessions({ project: "user-tracking" });
      expect(sessions).toHaveLength(6); // 3 users * 2 sessions
    });
  });

  describe("RAG call tracking", () => {
    it("should preserve retrieved context through storage and retrieval", async () => {
      const ragInput = createRagLogCallInput({
        project: "rag-integration",
        retrievedContext: [
          { source: "vector-db", docId: "doc-001", hash: "abc123" },
          { source: "vector-db", docId: "doc-002", hash: "def456" },
          { source: "knowledge-base", docId: "kb-001" },
        ],
      });

      const logResult = await logModelCall(ragInput);

      // Retrieve via search
      const searchResults = await searchModelCalls({ project: "rag-integration" });
      expect(searchResults[0].retrievedContext).toBeDefined();

      // Retrieve via resource (full data, not truncated)
      const resourceResult = await resourceHandlers.getCall(logResult.id);
      expect(resourceResult!.retrievedContext).toHaveLength(3);
      expect(resourceResult!.retrievedContext![0]).toEqual({
        source: "vector-db",
        docId: "doc-001",
        hash: "abc123",
      });
    });
  });

  describe("Safety status tracking", () => {
    it("should track calls with different safety statuses", async () => {
      const safetyStatuses = [
        { status: "passed" as const },
        { status: "flagged" as const, details: "Content flagged for review" },
        { status: "blocked" as const, details: "Content blocked by filters" },
      ];

      const loggedIds: string[] = [];

      for (const safety of safetyStatuses) {
        const result = await logModelCall(
          createMinimalLogCallInput({
            project: "safety-tracking",
            safety,
          })
        );
        loggedIds.push(result.id);
      }

      // Verify each call preserved its safety status
      for (let i = 0; i < loggedIds.length; i++) {
        const call = await resourceHandlers.getCall(loggedIds[i]);
        expect(call!.safety!.status).toBe(safetyStatuses[i].status);
        if (safetyStatuses[i].details) {
          expect(call!.safety!.details).toBe(safetyStatuses[i].details);
        }
      }
    });
  });

  describe("Conversation reconstruction", () => {
    it("should allow reconstruction of a conversation from session calls", async () => {
      const sessionId = uniqueId("conversation");
      const conversation = [
        { user: "Hello, I need help", assistant: "Hi! How can I help you today?" },
        { user: "What is TypeScript?", assistant: "TypeScript is a typed superset of JavaScript." },
        { user: "Can you show an example?", assistant: "Sure! Here's a simple example..." },
      ];

      for (const turn of conversation) {
        await logModelCall(
          createMinimalLogCallInput({
            sessionId,
            project: "conversation-test",
            inputMessages: [{ role: "user", content: turn.user }],
            outputMessages: [{ role: "assistant", content: turn.assistant }],
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 5)); // Ensure ordering
      }

      // Reconstruct conversation
      const sessionCalls = await getSessionCalls({ sessionId });

      expect(sessionCalls).toHaveLength(3);

      // Verify conversation order and content
      for (let i = 0; i < sessionCalls.length; i++) {
        expect(sessionCalls[i].inputMessages[0].content).toBe(conversation[i].user);
        expect(sessionCalls[i].outputMessages[0].content).toBe(conversation[i].assistant);
      }
    });
  });

  describe("Metrics consistency", () => {
    it("should maintain consistency between tools and resources", async () => {
      const sessionId = uniqueId("consistency-session");

      for (let i = 0; i < 10; i++) {
        await logModelCall(
          createMinimalLogCallInput({
            sessionId,
            project: "consistency-test",
            tokensIn: 100,
            tokensOut: 50,
            latencyMs: 200,
          })
        );
      }

      // Get metrics from tool
      const toolMetrics = await getAggregateMetrics({ project: "consistency-test" });

      // Get metrics from resource
      const resourceMetrics = await resourceHandlers.getAggregateMetrics(
        "project=consistency-test"
      );

      // Get session from list_sessions
      const sessions = await listSessions({ project: "consistency-test" });

      // Get session from resource
      const sessionResource = await resourceHandlers.getSession(sessionId);

      // Verify consistency
      expect(toolMetrics.callCount).toBe(resourceMetrics.callCount);
      expect(toolMetrics.totalTokensIn).toBe(resourceMetrics.totalTokensIn);
      expect(toolMetrics.totalTokensOut).toBe(resourceMetrics.totalTokensOut);
      expect(toolMetrics.avgLatencyMs).toBe(resourceMetrics.avgLatencyMs);

      expect(sessions[0].callCount).toBe(sessionResource.session!.callCount);
      expect(sessions[0].totalTokensIn).toBe(sessionResource.session!.totalTokensIn);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle concurrent logging operations", async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        logModelCall(
          createMinimalLogCallInput({
            project: "concurrent-test",
            userId: `user-${i % 5}`,
            sessionId: `session-${Math.floor(i / 10)}`,
          })
        )
      );

      const results = await Promise.all(promises);

      // All should succeed with unique IDs
      const ids = new Set(results.map((r) => r.id));
      expect(ids.size).toBe(50);

      // Verify data integrity
      const allCalls = await searchModelCalls({ project: "concurrent-test" });
      expect(allCalls).toHaveLength(50);
    });

    it("should handle empty filters gracefully", async () => {
      await logModelCall(createMinimalLogCallInput());

      const searchResults = await searchModelCalls({});
      const sessions = await listSessions({});
      const metrics = await getAggregateMetrics({});
      const resourceMetrics = await resourceHandlers.getAggregateMetrics("");

      expect(searchResults.length).toBeGreaterThan(0);
      expect(metrics.callCount).toBeGreaterThan(0);
      expect(resourceMetrics.callCount).toBeGreaterThan(0);
    });

    it("should handle non-existent data gracefully", async () => {
      const searchResults = await searchModelCalls({ project: "non-existent" });
      const sessions = await listSessions({ project: "non-existent" });
      const sessionCalls = await getSessionCalls({ sessionId: "non-existent" });
      const metrics = await getAggregateMetrics({ project: "non-existent" });
      const callResource = await resourceHandlers.getCall("non-existent-id");
      const sessionResource = await resourceHandlers.getSession("non-existent");

      expect(searchResults).toHaveLength(0);
      expect(sessions).toHaveLength(0);
      expect(sessionCalls).toHaveLength(0);
      expect(metrics.callCount).toBe(0);
      expect(callResource).toBeNull();
      expect(sessionResource.session).toBeNull();
    });
  });

  describe("Data integrity", () => {
    it("should preserve all data fields through storage and retrieval", async () => {
      const input = createCompleteLogCallInput();
      const logResult = await logModelCall(input);

      const retrieved = await resourceHandlers.getCall(logResult.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.project).toBe(input.project);
      expect(retrieved!.environment).toBe(input.environment);
      expect(retrieved!.userId).toBe(input.userId);
      expect(retrieved!.sessionId).toBe(input.sessionId);
      expect(retrieved!.modelName).toBe(input.modelName);
      expect(retrieved!.modelVersion).toBe(input.modelVersion);
      expect(retrieved!.promptType).toBe(input.promptType);
      expect(retrieved!.inputMessages).toEqual(input.inputMessages);
      expect(retrieved!.outputMessages).toEqual(input.outputMessages);
      expect(retrieved!.latencyMs).toBe(input.latencyMs);
      expect(retrieved!.tokensIn).toBe(input.tokensIn);
      expect(retrieved!.tokensOut).toBe(input.tokensOut);
      expect(retrieved!.safety).toEqual(input.safety);
      expect(retrieved!.metrics).toEqual(input.metrics);
      expect(retrieved!.traceId).toBe(input.traceId);
      expect(retrieved!.requestId).toBe(input.requestId);
    });
  });
});
