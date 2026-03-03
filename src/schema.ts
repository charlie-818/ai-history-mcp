/**
 * Schema definitions for AI usage metrics and logging.
 * These types define the data model for tracking model calls,
 * sessions, and aggregate metrics.
 */

/** Supported message roles in model conversations */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/** Output message roles (assistant or tool responses) */
export type OutputMessageRole = "assistant" | "tool";

/** Environment classification for model calls */
export type Environment = "dev" | "staging" | "prod" | string;

/** Classification of prompt types */
export type PromptType = "chat" | "rag" | "tool" | "agent" | string;

/** Safety check status */
export type SafetyStatus = "passed" | "flagged" | "blocked";

/** A message in the model conversation */
export interface Message {
  role: MessageRole;
  content: string;
}

/** An output message from the model or tool */
export interface OutputMessage {
  role: OutputMessageRole;
  content: string;
}

/** Retrieved context for RAG-style prompts */
export interface RetrievedContext {
  source: string;
  docId: string;
  hash?: string;
}

/** Safety check result */
export interface SafetyResult {
  status: SafetyStatus;
  details?: string;
}

/**
 * A single model call log entry.
 * Captures all relevant metadata about an AI model invocation.
 */
export interface ModelCallLog {
  /** Unique identifier for this call */
  id: string;

  /** ISO timestamp of when the call was made */
  timestamp: string;

  /** Project identifier */
  project: string;

  /** Environment (dev, staging, prod, or custom) */
  environment: Environment;

  /** Optional user identifier */
  userId?: string;

  /** Optional session identifier for grouping related calls */
  sessionId?: string;

  /** Name of the model used (e.g., "gpt-4", "claude-3-opus") */
  modelName: string;

  /** Version of the model if available */
  modelVersion?: string;

  /** Type of prompt (chat, rag, tool, agent, or custom) */
  promptType?: PromptType;

  /** Input messages sent to the model */
  inputMessages: Message[];

  /** Retrieved context for RAG prompts */
  retrievedContext?: RetrievedContext[];

  /** Output messages from the model */
  outputMessages: OutputMessage[];

  /** Latency of the call in milliseconds */
  latencyMs?: number;

  /** Number of input tokens */
  tokensIn?: number;

  /** Number of output tokens */
  tokensOut?: number;

  /** Safety check results */
  safety?: SafetyResult;

  /** Custom metrics (key-value pairs) */
  metrics?: Record<string, number | string>;

  /** Distributed tracing ID */
  traceId?: string;

  /** Request ID from the model provider */
  requestId?: string;
}

/**
 * Summary of a session's activity.
 * Aggregates metrics across all calls in a session.
 */
export interface SessionSummary {
  /** Session identifier */
  sessionId: string;

  /** Project this session belongs to */
  project: string;

  /** Environment of the session */
  environment: string;

  /** Timestamp of the first call in this session */
  firstCallAt: string;

  /** Timestamp of the most recent call in this session */
  lastCallAt: string;

  /** Total number of calls in this session */
  callCount: number;

  /** Total input tokens across all calls */
  totalTokensIn: number;

  /** Total output tokens across all calls */
  totalTokensOut: number;

  /** Average latency across all calls (if available) */
  avgLatencyMs?: number;
}

/**
 * Aggregate metrics across multiple calls.
 */
export interface AggregateMetrics {
  /** Total number of calls */
  callCount: number;

  /** Total input tokens */
  totalTokensIn: number;

  /** Total output tokens */
  totalTokensOut: number;

  /** Average latency (if latency data available) */
  avgLatencyMs?: number;
}

/** Parameters for searching model calls */
export interface SearchCallsParams {
  project?: string;
  environment?: string;
  userId?: string;
  modelName?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Parameters for listing sessions */
export interface ListSessionsParams {
  project?: string;
  environment?: string;
  limit?: number;
}

/** Parameters for getting aggregate metrics */
export interface AggregateMetricsParams {
  project?: string;
  environment?: string;
  from?: string;
  to?: string;
}

/**
 * Input for logging a model call.
 * Excludes auto-generated fields like id and timestamp.
 */
export type LogCallInput = Omit<ModelCallLog, "id" | "timestamp">;
