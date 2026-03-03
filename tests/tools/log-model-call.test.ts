/**
 * Unit tests for log_model_call tool
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ZodError } from "zod";
import { InMemoryMetricsStore } from "../../src/store.js";
import {
  createLogModelCallTool,
  logModelCallInputSchema,
} from "../../src/tools/log-model-call.js";
import {
  createMinimalLogCallInput,
  createCompleteLogCallInput,
  createRagLogCallInput,
  createToolLogCallInput,
  resetFixtureCounter,
} from "../fixtures.js";

describe("log_model_call tool", () => {
  let store: InMemoryMetricsStore;
  let logModelCall: ReturnType<typeof createLogModelCallTool>;

  beforeEach(() => {
    store = new InMemoryMetricsStore();
    logModelCall = createLogModelCallTool(store);
    resetFixtureCounter();
  });

  describe("input validation", () => {
    it("should accept valid minimal input", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      const result = logModelCallInputSchema.parse(input);

      expect(result.project).toBe("test-project");
      expect(result.environment).toBe("dev"); // default
    });

    it("should reject missing required field: project", () => {
      const input = {
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject missing required field: modelName", () => {
      const input = {
        project: "test-project",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject missing required field: inputMessages", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject missing required field: outputMessages", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject empty project string", () => {
      const input = {
        project: "",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject empty modelName string", () => {
      const input = {
        project: "test-project",
        modelName: "",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject empty inputMessages array", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject empty outputMessages array", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject invalid input message role", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "invalid", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject invalid output message role", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "user", content: "Hi" }], // user is not valid for output
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should accept all valid input message roles", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [
          { role: "system", content: "System" },
          { role: "user", content: "User" },
          { role: "assistant", content: "Assistant" },
          { role: "tool", content: "Tool" },
        ],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      const result = logModelCallInputSchema.parse(input);
      expect(result.inputMessages).toHaveLength(4);
    });

    it("should accept all valid output message roles", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [
          { role: "assistant", content: "Assistant" },
          { role: "tool", content: "Tool" },
        ],
      };

      const result = logModelCallInputSchema.parse(input);
      expect(result.outputMessages).toHaveLength(2);
    });

    it("should reject negative latencyMs", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        latencyMs: -100,
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should reject negative tokensIn", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        tokensIn: -50,
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should accept zero tokens", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        tokensIn: 0,
        tokensOut: 0,
      };

      const result = logModelCallInputSchema.parse(input);
      expect(result.tokensIn).toBe(0);
      expect(result.tokensOut).toBe(0);
    });

    it("should validate safety object structure", () => {
      const validInput = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        safety: { status: "passed" },
      };

      const result = logModelCallInputSchema.parse(validInput);
      expect(result.safety?.status).toBe("passed");
    });

    it("should reject invalid safety status", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        safety: { status: "invalid" },
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should accept valid safety statuses", () => {
      const statuses = ["passed", "flagged", "blocked"];

      for (const status of statuses) {
        const input = {
          project: "test-project",
          modelName: "gpt-4",
          inputMessages: [{ role: "user", content: "Hello" }],
          outputMessages: [{ role: "assistant", content: "Hi" }],
          safety: { status, details: "Some details" },
        };

        const result = logModelCallInputSchema.parse(input);
        expect(result.safety?.status).toBe(status);
      }
    });

    it("should validate retrievedContext structure", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        retrievedContext: [
          { source: "kb", docId: "doc-1" },
          { source: "kb", docId: "doc-2", hash: "abc123" },
        ],
      };

      const result = logModelCallInputSchema.parse(input);
      expect(result.retrievedContext).toHaveLength(2);
    });

    it("should reject retrievedContext missing required fields", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        retrievedContext: [{ source: "kb" }], // missing docId
      };

      expect(() => logModelCallInputSchema.parse(input)).toThrow(ZodError);
    });

    it("should validate metrics record structure", () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
        metrics: {
          confidence: 0.95,
          quality: "high",
          count: 42,
        },
      };

      const result = logModelCallInputSchema.parse(input);
      expect(result.metrics?.confidence).toBe(0.95);
      expect(result.metrics?.quality).toBe("high");
    });
  });

  describe("tool execution", () => {
    it("should log a minimal call and return id and stored flag", async () => {
      const input = createMinimalLogCallInput();
      const result = await logModelCall(input);

      expect(result.id).toBeDefined();
      expect(result.stored).toBe(true);
    });

    it("should log a complete call with all fields", async () => {
      const input = createCompleteLogCallInput();
      const result = await logModelCall(input);

      expect(result.id).toBeDefined();
      expect(result.stored).toBe(true);

      // Verify it was stored correctly
      const stored = await store.getCall(result.id);
      expect(stored).not.toBeNull();
      expect(stored!.project).toBe(input.project);
      expect(stored!.sessionId).toBe(input.sessionId);
      expect(stored!.modelVersion).toBe(input.modelVersion);
    });

    it("should log a RAG call with retrieved context", async () => {
      const input = createRagLogCallInput();
      const result = await logModelCall(input);

      const stored = await store.getCall(result.id);
      expect(stored!.retrievedContext).toHaveLength(2);
      expect(stored!.promptType).toBe("rag");
    });

    it("should log a tool-use call", async () => {
      const input = createToolLogCallInput();
      const result = await logModelCall(input);

      const stored = await store.getCall(result.id);
      expect(stored!.promptType).toBe("tool");
      expect(stored!.outputMessages).toHaveLength(2);
    });

    it("should generate unique IDs for each logged call", async () => {
      const results = await Promise.all([
        logModelCall(createMinimalLogCallInput()),
        logModelCall(createMinimalLogCallInput()),
        logModelCall(createMinimalLogCallInput()),
      ]);

      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should throw on invalid input", async () => {
      const invalidInput = {
        project: "", // Invalid: empty
        modelName: "gpt-4",
        inputMessages: [],
        outputMessages: [],
      };

      await expect(logModelCall(invalidInput)).rejects.toThrow();
    });

    it("should apply default environment when not specified", async () => {
      const input = {
        project: "test-project",
        modelName: "gpt-4",
        inputMessages: [{ role: "user", content: "Hello" }],
        outputMessages: [{ role: "assistant", content: "Hi" }],
      };

      const result = await logModelCall(input);
      const stored = await store.getCall(result.id);

      expect(stored!.environment).toBe("dev");
    });

    it("should store custom environment when specified", async () => {
      const input = createMinimalLogCallInput({ environment: "production" });
      const result = await logModelCall(input);
      const stored = await store.getCall(result.id);

      expect(stored!.environment).toBe("production");
    });
  });

  describe("data integrity", () => {
    it("should preserve message content exactly", async () => {
      const complexContent = `
        Multi-line content with special characters:
        - Unicode: 日本語 🎉 émojis
        - JSON: {"key": "value"}
        - Code: function foo() { return 42; }
      `;

      const input = createMinimalLogCallInput({
        inputMessages: [{ role: "user", content: complexContent }],
        outputMessages: [{ role: "assistant", content: complexContent }],
      });

      const result = await logModelCall(input);
      const stored = await store.getCall(result.id);

      expect(stored!.inputMessages[0].content).toBe(complexContent);
      expect(stored!.outputMessages[0].content).toBe(complexContent);
    });

    it("should preserve numeric precision in metrics", async () => {
      const input = createMinimalLogCallInput({
        metrics: {
          score: 0.123456789,
          count: 9007199254740991, // MAX_SAFE_INTEGER
        },
      });

      const result = await logModelCall(input);
      const stored = await store.getCall(result.id);

      expect(stored!.metrics!.score).toBe(0.123456789);
      expect(stored!.metrics!.count).toBe(9007199254740991);
    });
  });
});
