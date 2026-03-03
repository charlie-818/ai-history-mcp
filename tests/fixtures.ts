/**
 * Test fixtures and factory functions for creating test data.
 * Provides consistent, reusable test data across all test files.
 */

import { LogCallInput, ModelCallLog, Message, OutputMessage } from "../src/schema.js";

/**
 * Counter for generating unique IDs in fixtures
 */
let fixtureCounter = 0;

/**
 * Reset the fixture counter (useful between tests)
 */
export function resetFixtureCounter(): void {
  fixtureCounter = 0;
}

/**
 * Generate a unique fixture ID
 */
export function uniqueId(prefix: string = "test"): string {
  return `${prefix}-${++fixtureCounter}-${Date.now()}`;
}

/**
 * Create a basic input message
 */
export function createInputMessage(
  role: Message["role"] = "user",
  content: string = "Hello, how are you?"
): Message {
  return { role, content };
}

/**
 * Create a basic output message
 */
export function createOutputMessage(
  role: OutputMessage["role"] = "assistant",
  content: string = "I'm doing well, thank you!"
): OutputMessage {
  return { role, content };
}

/**
 * Create a minimal valid LogCallInput for testing
 */
export function createMinimalLogCallInput(
  overrides: Partial<LogCallInput> = {}
): LogCallInput {
  return {
    project: overrides.project ?? "test-project",
    environment: overrides.environment ?? "dev",
    modelName: overrides.modelName ?? "gpt-4",
    inputMessages: overrides.inputMessages ?? [createInputMessage()],
    outputMessages: overrides.outputMessages ?? [createOutputMessage()],
    ...overrides,
  };
}

/**
 * Create a complete LogCallInput with all optional fields
 */
export function createCompleteLogCallInput(
  overrides: Partial<LogCallInput> = {}
): LogCallInput {
  const sessionId = overrides.sessionId ?? uniqueId("session");
  return {
    project: "complete-project",
    environment: "prod",
    userId: uniqueId("user"),
    sessionId,
    modelName: "claude-3-opus",
    modelVersion: "20240229",
    promptType: "chat",
    inputMessages: [
      createInputMessage("system", "You are a helpful assistant."),
      createInputMessage("user", "What is the capital of France?"),
    ],
    outputMessages: [
      createOutputMessage("assistant", "The capital of France is Paris."),
    ],
    latencyMs: 250,
    tokensIn: 50,
    tokensOut: 20,
    safety: { status: "passed" },
    metrics: { confidence: 0.95, responseQuality: "high" },
    traceId: uniqueId("trace"),
    requestId: uniqueId("request"),
    ...overrides,
  };
}

/**
 * Create a RAG-style LogCallInput
 */
export function createRagLogCallInput(
  overrides: Partial<LogCallInput> = {}
): LogCallInput {
  return {
    project: "rag-project",
    environment: "dev",
    modelName: "gpt-4-turbo",
    promptType: "rag",
    inputMessages: [
      createInputMessage("system", "Answer based on the provided context."),
      createInputMessage("user", "What does the document say about pricing?"),
    ],
    retrievedContext: [
      { source: "knowledge-base", docId: "doc-123", hash: "abc123" },
      { source: "knowledge-base", docId: "doc-456" },
    ],
    outputMessages: [
      createOutputMessage(
        "assistant",
        "Based on the document, the pricing starts at $99/month."
      ),
    ],
    tokensIn: 500,
    tokensOut: 100,
    ...overrides,
  };
}

/**
 * Create a tool-use LogCallInput
 */
export function createToolLogCallInput(
  overrides: Partial<LogCallInput> = {}
): LogCallInput {
  return {
    project: "tool-project",
    environment: "staging",
    modelName: "claude-3-sonnet",
    promptType: "tool",
    inputMessages: [
      createInputMessage("user", "What's the weather in New York?"),
    ],
    outputMessages: [
      createOutputMessage("tool", '{"temperature": 72, "conditions": "sunny"}'),
      createOutputMessage(
        "assistant",
        "The weather in New York is 72°F and sunny."
      ),
    ],
    latencyMs: 1500,
    tokensIn: 30,
    tokensOut: 50,
    ...overrides,
  };
}

/**
 * Create an agent-style LogCallInput
 */
export function createAgentLogCallInput(
  overrides: Partial<LogCallInput> = {}
): LogCallInput {
  return {
    project: "agent-project",
    environment: "prod",
    modelName: "gpt-4",
    promptType: "agent",
    sessionId: overrides.sessionId ?? uniqueId("agent-session"),
    inputMessages: [
      createInputMessage("system", "You are an autonomous agent."),
      createInputMessage("user", "Research and summarize recent AI news."),
    ],
    outputMessages: [
      createOutputMessage(
        "assistant",
        "I'll search for recent AI news and provide a summary."
      ),
    ],
    latencyMs: 3000,
    tokensIn: 200,
    tokensOut: 500,
    traceId: uniqueId("agent-trace"),
    ...overrides,
  };
}

/**
 * Create multiple call inputs for session testing
 */
export function createSessionCallInputs(
  sessionId: string,
  count: number = 3,
  baseOverrides: Partial<LogCallInput> = {}
): LogCallInput[] {
  const calls: LogCallInput[] = [];
  for (let i = 0; i < count; i++) {
    calls.push(
      createMinimalLogCallInput({
        ...baseOverrides,
        sessionId,
        inputMessages: [createInputMessage("user", `Message ${i + 1}`)],
        outputMessages: [createOutputMessage("assistant", `Response ${i + 1}`)],
        tokensIn: 10 + i * 5,
        tokensOut: 20 + i * 10,
        latencyMs: 100 + i * 50,
      })
    );
  }
  return calls;
}

/**
 * Create a flagged safety result call input
 */
export function createFlaggedCallInput(
  overrides: Partial<LogCallInput> = {}
): LogCallInput {
  return createMinimalLogCallInput({
    safety: {
      status: "flagged",
      details: "Content flagged for potential policy violation",
    },
    ...overrides,
  });
}

/**
 * Create a blocked safety result call input
 */
export function createBlockedCallInput(
  overrides: Partial<LogCallInput> = {}
): LogCallInput {
  return createMinimalLogCallInput({
    safety: {
      status: "blocked",
      details: "Content blocked due to safety filters",
    },
    outputMessages: [
      createOutputMessage(
        "assistant",
        "I cannot help with that request."
      ),
    ],
    ...overrides,
  });
}

/**
 * Generate an ISO date string offset by days from now
 */
export function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Generate an ISO date string for a specific time today
 */
export function todayAt(hours: number, minutes: number = 0): string {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

/**
 * Sample projects for testing
 */
export const sampleProjects = [
  "chatbot",
  "search-assistant",
  "code-helper",
  "customer-support",
  "analytics-agent",
];

/**
 * Sample model names for testing
 */
export const sampleModels = [
  "gpt-4",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
];

/**
 * Sample environments for testing
 */
export const sampleEnvironments = ["dev", "staging", "prod"];

/**
 * Create diverse call inputs for comprehensive testing
 */
export function createDiverseCallInputs(count: number = 10): LogCallInput[] {
  const calls: LogCallInput[] = [];

  for (let i = 0; i < count; i++) {
    const project = sampleProjects[i % sampleProjects.length];
    const model = sampleModels[i % sampleModels.length];
    const environment = sampleEnvironments[i % sampleEnvironments.length];

    calls.push(
      createMinimalLogCallInput({
        project,
        modelName: model,
        environment,
        userId: `user-${i % 5}`,
        sessionId: `session-${Math.floor(i / 3)}`,
        tokensIn: 10 + i * 10,
        tokensOut: 20 + i * 5,
        latencyMs: 100 + i * 20,
      })
    );
  }

  return calls;
}

/**
 * Assert that a ModelCallLog has required fields populated
 */
export function assertValidModelCallLog(call: ModelCallLog): void {
  if (!call.id) throw new Error("Call must have an id");
  if (!call.timestamp) throw new Error("Call must have a timestamp");
  if (!call.project) throw new Error("Call must have a project");
  if (!call.environment) throw new Error("Call must have an environment");
  if (!call.modelName) throw new Error("Call must have a modelName");
  if (!call.inputMessages?.length) throw new Error("Call must have inputMessages");
  if (!call.outputMessages?.length) throw new Error("Call must have outputMessages");

  // Validate timestamp is ISO format
  const date = new Date(call.timestamp);
  if (isNaN(date.getTime())) {
    throw new Error("Timestamp must be valid ISO date");
  }
}
