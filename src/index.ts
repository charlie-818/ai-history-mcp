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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { InMemoryMetricsStore, MetricsStore } from "./store.js";
import {
  createLogModelCallTool,
  logModelCallToolDefinition,
  createSearchModelCallsTool,
  searchModelCallsToolDefinition,
  createListSessionsTool,
  listSessionsToolDefinition,
  createGetSessionCallsTool,
  getSessionCallsToolDefinition,
  createGetAggregateMetricsTool,
  getAggregateMetricsToolDefinition,
} from "./tools/index.js";
import { createResourceHandlers, resourceTemplates } from "./resources/index.js";

/**
 * Initialize and start the MCP server
 */
async function main() {
  // Initialize the metrics store
  // Replace InMemoryMetricsStore with a database-backed implementation for production
  const store: MetricsStore = new InMemoryMetricsStore();

  // Create tool handlers
  const logModelCall = createLogModelCallTool(store);
  const searchModelCalls = createSearchModelCallsTool(store);
  const listSessions = createListSessionsTool(store);
  const getSessionCalls = createGetSessionCallsTool(store);
  const getAggregateMetrics = createGetAggregateMetricsTool(store);

  // Create resource handlers
  const resourceHandlers = createResourceHandlers(store);

  // Create the MCP server
  const server = new Server(
    {
      name: "ai-usage-metrics",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        logModelCallToolDefinition,
        searchModelCallsToolDefinition,
        listSessionsToolDefinition,
        getSessionCallsToolDefinition,
        getAggregateMetricsToolDefinition,
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case "log_model_call":
          result = await logModelCall(args);
          break;
        case "search_model_calls":
          result = await searchModelCalls(args);
          break;
        case "list_sessions":
          result = await listSessions(args);
          break;
        case "get_session_calls":
          result = await getSessionCalls(args);
          break;
        case "get_aggregate_metrics":
          result = await getAggregateMetrics(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: message }),
          },
        ],
        isError: true,
      };
    }
  });

  // Register resource templates handler
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: resourceTemplates.map((t) => ({
        uriTemplate: t.uriTemplate,
        name: t.name,
        description: t.description,
        mimeType: t.mimeType,
      })),
    };
  });

  // Register resource list handler (returns empty since we use templates)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [],
    };
  });

  // Register resource read handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      // Parse the URI to determine the resource type
      const url = new URL(uri);

      if (url.protocol !== "ai-usage:") {
        throw new Error(`Unknown resource protocol: ${url.protocol}`);
      }

      const path = url.pathname.replace(/^\/\//, "");
      const parts = path.split("/");

      let result: unknown;

      if (parts[0] === "calls" && parts.length === 2) {
        // calls/{id}
        const id = parts[1];
        result = await resourceHandlers.getCall(id);
        if (!result) {
          throw new Error(`Call not found: ${id}`);
        }
      } else if (parts[0] === "sessions" && parts.length === 2) {
        // sessions/{sessionId}
        const sessionId = parts[1];
        result = await resourceHandlers.getSession(sessionId);
      } else if (parts[0] === "metrics" && parts[1] === "aggregate") {
        // metrics/aggregate?...
        result = await resourceHandlers.getAggregateMetrics(url.search.slice(1));
      } else {
        throw new Error(`Unknown resource path: ${path}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read resource: ${message}`);
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}

// Run the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
