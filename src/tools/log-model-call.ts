/**
 * Tool: log_model_call
 * Purpose: Log a model call from an agent or application.
 *
 * This tool should be called by AI agents/applications after each model invocation
 * to record the call for analytics, debugging, and cost tracking purposes.
 *
 * Example usage from a host application:
 * After making a call to an LLM, invoke this tool with the call details:
 *
 * ```
 * await mcpClient.callTool("log_model_call", {
 *   project: "my-chatbot",
 *   environment: "prod",
 *   modelName: "gpt-4",
 *   inputMessages: [{ role: "user", content: "Hello" }],
 *   outputMessages: [{ role: "assistant", content: "Hi there!" }],
 *   tokensIn: 10,
 *   tokensOut: 15,
 *   latencyMs: 234
 * });
 * ```
 */

import { z } from "zod";
import { MetricsStore } from "../store.js";
import {
  Message,
  OutputMessage,
  RetrievedContext,
  SafetyResult,
  LogCallInput,
} from "../schema.js";

// Input validation schema using Zod
export const logModelCallInputSchema = z.object({
  project: z.string().min(1, "project is required"),
  environment: z.string().default("dev"),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  modelName: z.string().min(1, "modelName is required"),
  modelVersion: z.string().optional(),
  promptType: z.string().optional(),
  inputMessages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
      })
    )
    .min(1, "inputMessages must have at least one message"),
  retrievedContext: z
    .array(
      z.object({
        source: z.string(),
        docId: z.string(),
        hash: z.string().optional(),
      })
    )
    .optional(),
  outputMessages: z
    .array(
      z.object({
        role: z.enum(["assistant", "tool"]),
        content: z.string(),
      })
    )
    .min(1, "outputMessages must have at least one message"),
  latencyMs: z.number().positive().optional(),
  tokensIn: z.number().nonnegative().optional(),
  tokensOut: z.number().nonnegative().optional(),
  safety: z
    .object({
      status: z.enum(["passed", "flagged", "blocked"]),
      details: z.string().optional(),
    })
    .optional(),
  metrics: z.record(z.union([z.number(), z.string()])).optional(),
  traceId: z.string().optional(),
  requestId: z.string().optional(),
});

export type LogModelCallInput = z.infer<typeof logModelCallInputSchema>;

export interface LogModelCallResult {
  id: string;
  stored: boolean;
}

/**
 * Create the log_model_call tool handler
 */
export function createLogModelCallTool(store: MetricsStore) {
  return async (input: unknown): Promise<LogModelCallResult> => {
    // Validate input
    const parsed = logModelCallInputSchema.parse(input);

    // Convert to LogCallInput
    const callInput: LogCallInput = {
      project: parsed.project,
      environment: parsed.environment,
      userId: parsed.userId,
      sessionId: parsed.sessionId,
      modelName: parsed.modelName,
      modelVersion: parsed.modelVersion,
      promptType: parsed.promptType,
      inputMessages: parsed.inputMessages as Message[],
      retrievedContext: parsed.retrievedContext as RetrievedContext[] | undefined,
      outputMessages: parsed.outputMessages as OutputMessage[],
      latencyMs: parsed.latencyMs,
      tokensIn: parsed.tokensIn,
      tokensOut: parsed.tokensOut,
      safety: parsed.safety as SafetyResult | undefined,
      metrics: parsed.metrics,
      traceId: parsed.traceId,
      requestId: parsed.requestId,
    };

    // Store the call
    const storedCall = await store.logCall(callInput);

    return {
      id: storedCall.id,
      stored: true,
    };
  };
}

// MCP tool definition for registration
export const logModelCallToolDefinition = {
  name: "log_model_call",
  description:
    "Log a model call for tracking AI usage metrics. Call this after each model invocation to record the interaction.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project: {
        type: "string",
        description: "Project identifier",
      },
      environment: {
        type: "string",
        description: "Environment (dev, staging, prod)",
        default: "dev",
      },
      userId: {
        type: "string",
        description: "Optional user identifier",
      },
      sessionId: {
        type: "string",
        description: "Optional session identifier for grouping related calls",
      },
      modelName: {
        type: "string",
        description: "Name of the model used (e.g., gpt-4, claude-3-opus)",
      },
      modelVersion: {
        type: "string",
        description: "Version of the model",
      },
      promptType: {
        type: "string",
        description: "Type of prompt (chat, rag, tool, agent)",
      },
      inputMessages: {
        type: "array",
        description: "Input messages sent to the model",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["system", "user", "assistant", "tool"],
            },
            content: { type: "string" },
          },
          required: ["role", "content"],
        },
      },
      retrievedContext: {
        type: "array",
        description: "Retrieved context for RAG prompts",
        items: {
          type: "object",
          properties: {
            source: { type: "string" },
            docId: { type: "string" },
            hash: { type: "string" },
          },
          required: ["source", "docId"],
        },
      },
      outputMessages: {
        type: "array",
        description: "Output messages from the model",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["assistant", "tool"],
            },
            content: { type: "string" },
          },
          required: ["role", "content"],
        },
      },
      latencyMs: {
        type: "number",
        description: "Latency of the call in milliseconds",
      },
      tokensIn: {
        type: "number",
        description: "Number of input tokens",
      },
      tokensOut: {
        type: "number",
        description: "Number of output tokens",
      },
      safety: {
        type: "object",
        description: "Safety check results",
        properties: {
          status: {
            type: "string",
            enum: ["passed", "flagged", "blocked"],
          },
          details: { type: "string" },
        },
        required: ["status"],
      },
      metrics: {
        type: "object",
        description: "Custom metrics (key-value pairs)",
        additionalProperties: {
          oneOf: [{ type: "number" }, { type: "string" }],
        },
      },
      traceId: {
        type: "string",
        description: "Distributed tracing ID",
      },
      requestId: {
        type: "string",
        description: "Request ID from the model provider",
      },
    },
    required: ["project", "modelName", "inputMessages", "outputMessages"],
  },
};
