/**
 * Unit tests for get_session_calls tool
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ZodError } from "zod";
import { InMemoryMetricsStore } from "../../src/store.js";
import {
  createGetSessionCallsTool,
  getSessionCallsInputSchema,
} from "../../src/tools/get-session-calls.js";
import {
  createSessionCallInputs,
  createMinimalLogCallInput,
  resetFixtureCounter,
  uniqueId,
} from "../fixtures.js";

describe("get_session_calls tool", () => {
  let store: InMemoryMetricsStore;
  let getSessionCalls: ReturnType<typeof createGetSessionCallsTool>;

  beforeEach(async () => {
    store = new InMemoryMetricsStore();
    getSessionCalls = createGetSessionCallsTool(store);
    resetFixtureCounter();
  });

  describe("input validation", () => {
    it("should accept valid sessionId", () => {
      const result = getSessionCallsInputSchema.parse({ sessionId: "session-123" });
      expect(result.sessionId).toBe("session-123");
    });

    it("should reject missing sessionId", () => {
      expect(() => getSessionCallsInputSchema.parse({})).toThrow(ZodError);
    });

    it("should reject empty sessionId", () => {
      expect(() => getSessionCallsInputSchema.parse({ sessionId: "" })).toThrow(ZodError);
    });

    it("should accept sessionId with special characters", () => {
      const specialIds = [
        "session-123",
        "session_456",
        "session.789",
        "session/path",
        "session:colon",
        "550e8400-e29b-41d4-a716-446655440000", // UUID
      ];

      for (const id of specialIds) {
        const result = getSessionCallsInputSchema.parse({ sessionId: id });
        expect(result.sessionId).toBe(id);
      }
    });
  });

  describe("tool execution", () => {
    it("should return all calls for a session", async () => {
      const sessionId = uniqueId("session");
      const inputs = createSessionCallInputs(sessionId, 5);
      for (const input of inputs) {
        await store.logCall(input);
      }

      const calls = await getSessionCalls({ sessionId });

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
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const calls = await getSessionCalls({ sessionId });

      for (let i = 1; i < calls.length; i++) {
        const prevTime = new Date(calls[i - 1].timestamp).getTime();
        const currTime = new Date(calls[i].timestamp).getTime();
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });

    it("should return empty array for non-existent session", async () => {
      const calls = await getSessionCalls({ sessionId: "non-existent-session" });
      expect(calls).toHaveLength(0);
    });

    it("should only return calls from specified session", async () => {
      const session1 = uniqueId("session-1");
      const session2 = uniqueId("session-2");

      for (const input of createSessionCallInputs(session1, 3)) {
        await store.logCall(input);
      }
      for (const input of createSessionCallInputs(session2, 5)) {
        await store.logCall(input);
      }

      const calls1 = await getSessionCalls({ sessionId: session1 });
      const calls2 = await getSessionCalls({ sessionId: session2 });

      expect(calls1).toHaveLength(3);
      expect(calls2).toHaveLength(5);

      calls1.forEach((call) => expect(call.sessionId).toBe(session1));
      calls2.forEach((call) => expect(call.sessionId).toBe(session2));
    });
  });

  describe("result completeness", () => {
    it("should include all call fields in results", async () => {
      const sessionId = uniqueId("session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId,
          project: "test-project",
          environment: "prod",
          modelName: "gpt-4",
          userId: "user-123",
          tokensIn: 100,
          tokensOut: 50,
          latencyMs: 250,
        })
      );

      const calls = await getSessionCalls({ sessionId });

      expect(calls).toHaveLength(1);
      const call = calls[0];

      expect(call.id).toBeDefined();
      expect(call.timestamp).toBeDefined();
      expect(call.sessionId).toBe(sessionId);
      expect(call.project).toBe("test-project");
      expect(call.environment).toBe("prod");
      expect(call.modelName).toBe("gpt-4");
      expect(call.userId).toBe("user-123");
      expect(call.tokensIn).toBe(100);
      expect(call.tokensOut).toBe(50);
      expect(call.latencyMs).toBe(250);
    });

    it("should preserve full message content without truncation", async () => {
      const sessionId = uniqueId("session");
      const longContent = "x".repeat(1000);

      await store.logCall(
        createMinimalLogCallInput({
          sessionId,
          inputMessages: [{ role: "user", content: longContent }],
          outputMessages: [{ role: "assistant", content: longContent }],
        })
      );

      const calls = await getSessionCalls({ sessionId });

      expect(calls[0].inputMessages[0].content).toBe(longContent);
      expect(calls[0].outputMessages[0].content).toBe(longContent);
    });

    it("should include optional fields when present", async () => {
      const sessionId = uniqueId("session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId,
          modelVersion: "20240229",
          promptType: "chat",
          safety: { status: "passed", details: "All checks passed" },
          metrics: { confidence: 0.95 },
          traceId: "trace-123",
          requestId: "req-456",
        })
      );

      const calls = await getSessionCalls({ sessionId });
      const call = calls[0];

      expect(call.modelVersion).toBe("20240229");
      expect(call.promptType).toBe("chat");
      expect(call.safety).toEqual({ status: "passed", details: "All checks passed" });
      expect(call.metrics).toEqual({ confidence: 0.95 });
      expect(call.traceId).toBe("trace-123");
      expect(call.requestId).toBe("req-456");
    });

    it("should include retrievedContext when present", async () => {
      const sessionId = uniqueId("session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId,
          retrievedContext: [
            { source: "kb", docId: "doc-1", hash: "abc123" },
            { source: "kb", docId: "doc-2" },
          ],
        })
      );

      const calls = await getSessionCalls({ sessionId });

      expect(calls[0].retrievedContext).toHaveLength(2);
      expect(calls[0].retrievedContext![0]).toEqual({
        source: "kb",
        docId: "doc-1",
        hash: "abc123",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle session with single call", async () => {
      const sessionId = uniqueId("single-call-session");
      await store.logCall(createMinimalLogCallInput({ sessionId }));

      const calls = await getSessionCalls({ sessionId });

      expect(calls).toHaveLength(1);
    });

    it("should handle session with many calls", async () => {
      const sessionId = uniqueId("many-calls-session");

      for (let i = 0; i < 100; i++) {
        await store.logCall(
          createMinimalLogCallInput({
            sessionId,
            inputMessages: [{ role: "user", content: `Message ${i}` }],
          })
        );
      }

      const calls = await getSessionCalls({ sessionId });

      expect(calls).toHaveLength(100);
    });

    it("should handle empty store gracefully", async () => {
      const emptyStore = new InMemoryMetricsStore();
      const emptyGetSession = createGetSessionCallsTool(emptyStore);

      const calls = await emptyGetSession({ sessionId: "any-session" });
      expect(calls).toHaveLength(0);
    });

    it("should handle sessionId with unicode characters", async () => {
      const sessionId = "session-日本語-🎉";
      await store.logCall(createMinimalLogCallInput({ sessionId }));

      const calls = await getSessionCalls({ sessionId });

      expect(calls).toHaveLength(1);
      expect(calls[0].sessionId).toBe(sessionId);
    });
  });

  describe("call order verification", () => {
    it("should maintain chronological order for conversation replay", async () => {
      const sessionId = uniqueId("conversation-session");
      const messages = [
        "Hello, I need help with something.",
        "Sure, what do you need help with?",
        "I want to learn about TypeScript.",
        "TypeScript is a typed superset of JavaScript.",
        "Can you show me an example?",
      ];

      for (let i = 0; i < messages.length; i++) {
        await store.logCall(
          createMinimalLogCallInput({
            sessionId,
            inputMessages: [
              { role: i % 2 === 0 ? "user" : "assistant", content: messages[i] },
            ],
            outputMessages: [{ role: "assistant", content: `Response to: ${messages[i]}` }],
          })
        );
        // Ensure time ordering
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const calls = await getSessionCalls({ sessionId });

      expect(calls).toHaveLength(5);

      // Verify chronological order
      for (let i = 0; i < calls.length; i++) {
        expect(calls[i].inputMessages[0].content).toBe(messages[i]);
      }
    });
  });
});
