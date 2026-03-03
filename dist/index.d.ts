#!/usr/bin/env node
/**
 * AI Usage Metrics MCP Server
 *
 * This MCP server tracks AI usage metrics and structured logs for model calls.
 * It provides tools for logging and querying model calls, and resources for
 * inspecting sessions and aggregate metrics.
 *
 * Usage by an MCP host (Claude, agent runtime, etc.):
 *
 * After each model call, the host should invoke the `log_model_call` tool:
 *
 * ```typescript
 * // After making an LLM call
 * const response = await llm.complete({ ... });
 *
 * // Log the call using MCP
 * await mcpClient.callTool("log_model_call", {
 *   project: "my-agent",
 *   environment: "prod",
 *   sessionId: currentSessionId,
 *   modelName: "claude-3-opus",
 *   inputMessages: [...],
 *   outputMessages: [{ role: "assistant", content: response.text }],
 *   tokensIn: response.usage.input_tokens,
 *   tokensOut: response.usage.output_tokens,
 *   latencyMs: response.latency
 * });
 * ```
 *
 * The host can then query logged data using the search and aggregate tools,
 * or access resources directly for read-only inspection.
 */
export {};
//# sourceMappingURL=index.d.ts.map