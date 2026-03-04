# AI Usage Metrics MCP Server

<div align="center">

[![npm version](https://img.shields.io/npm/v/ai-usage-metrics-mcp?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/ai-usage-metrics-mcp)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHoiLz48L3N2Zz4=)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage-97%25-brightgreen?style=for-the-badge)](./tests)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

**Track AI usage metrics and structured logs across all your applications**

[Quick Start](#-quick-start) •
[One-Click Install](#-one-click-install) •
[Documentation](#-api-reference) •
[Contributing](#contributing)

</div>

---

A Model Context Protocol (MCP) server for tracking AI usage metrics and structured logs across your applications. Monitor model calls, analyze usage patterns, track costs, and debug AI interactions with a clean, extensible architecture.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#-quick-start)
- [One-Click Install](#-one-click-install)
  - [Claude Desktop](#claude-desktop)
  - [Claude Code CLI](#claude-code-cli)
  - [Cursor](#cursor)
  - [Windsurf](#windsurf)
  - [VS Code + Continue](#vs-code--continue)
  - [Cline](#cline)
  - [Zed](#zed)
- [Manual Installation](#manual-installation)
- [Usage](#usage)
- [API Reference](#-api-reference)
- [Data Model](#data-model)
- [Architecture](#architecture)
- [Extending the Server](#extending-the-server)
- [Development](#development)
- [Testing](#testing)
- [License](#license)

## Overview

This MCP server provides a centralized way to track and analyze AI model usage across your applications. Whether you're building chatbots, RAG systems, or autonomous agents, this server helps you:

- **Track every model call** with full context (inputs, outputs, metadata)
- **Analyze usage patterns** across projects, environments, and users
- **Monitor costs** via token counting and aggregation
- **Debug interactions** by replaying sessions and conversations
- **Ensure safety** by logging safety check results

The server implements the [Model Context Protocol](https://modelcontextprotocol.io/) specification, making it compatible with Claude, Cursor, Windsurf, and any MCP-enabled AI assistant or agent framework.

## Features

| Feature | Description |
|---------|-------------|
| **Comprehensive Logging** | Log model calls with full message history, token counts, latency, and custom metrics |
| **Session Tracking** | Group related calls into sessions for conversation replay and analysis |
| **Multi-Environment** | Track usage across dev, staging, and production environments |
| **Flexible Filtering** | Search and filter by project, environment, user, model, and date range |
| **Real-time Aggregation** | Get instant metrics on call counts, token usage, and latency |
| **Safety Monitoring** | Track safety check results (passed, flagged, blocked) |
| **RAG Support** | Log retrieved context with source attribution |
| **Extensible Storage** | Clean interface for swapping storage backends (in-memory, PostgreSQL, etc.) |

---

## 🚀 Quick Start

**No installation required!** Just add the server to your AI platform config:

```json
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
```

That's it! The package will be automatically downloaded and run when your AI platform starts.

---

## 📦 One-Click Install

Choose your AI platform and copy the configuration.

### Claude Desktop

<details>
<summary><strong>macOS</strong> — Click to expand</summary>

**Config file:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
```

**One-liner setup:**
```bash
mkdir -p ~/Library/Application\ Support/Claude

cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
EOF
```

</details>

<details>
<summary><strong>Windows</strong> — Click to expand</summary>

**Config file:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
```

**PowerShell one-liner:**
```powershell
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Claude"

@'
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
'@ | Out-File -FilePath "$env:APPDATA\Claude\claude_desktop_config.json" -Encoding UTF8
```

</details>

<details>
<summary><strong>Linux</strong> — Click to expand</summary>

**Config file:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
```

**One-liner setup:**
```bash
mkdir -p ~/.config/Claude
cat > ~/.config/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
EOF
```

</details>

---

### Claude Code CLI

**Recommended: Use the Claude Code command:**
```bash
claude mcp add ai-usage-metrics -- npx -y ai-usage-metrics-mcp
```

**Or manually edit** `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
```

---

### Cursor

**Config file:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
```

**One-liner setup (macOS/Linux):**
```bash
mkdir -p ~/.cursor
cat > ~/.cursor/mcp.json << 'EOF'
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
EOF
```

---

### Windsurf

**Config file:** `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
```

**One-liner setup (macOS/Linux):**
```bash
mkdir -p ~/.codeium/windsurf
cat > ~/.codeium/windsurf/mcp_config.json << 'EOF'
{
  "mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"]
    }
  }
}
EOF
```

---

### VS Code + Continue

**Config file:** `~/.continue/config.json`

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "ai-usage-metrics-mcp"]
        }
      }
    ]
  }
}
```

---

### Cline

**Config file:** VS Code Settings (`settings.json`)

```json
{
  "cline.mcpServers": {
    "ai-usage-metrics": {
      "command": "npx",
      "args": ["-y", "ai-usage-metrics-mcp"],
      "disabled": false
    }
  }
}
```

---

### Zed

**Config file:** `~/.config/zed/settings.json`

```json
{
  "context_servers": {
    "ai-usage-metrics": {
      "command": {
        "path": "npx",
        "args": ["-y", "ai-usage-metrics-mcp"]
      }
    }
  }
}
```

---

### Other MCP-Compatible Platforms

For any MCP-compatible platform, use these standard connection details:

| Setting | Value |
|---------|-------|
| **Transport** | `stdio` |
| **Command** | `npx` |
| **Arguments** | `["-y", "ai-usage-metrics-mcp"]` |
| **Server Name** | `ai-usage-metrics` |

**Generic MCP Configuration:**
```json
{
  "name": "ai-usage-metrics",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "ai-usage-metrics-mcp"]
}
```

---

## Manual Installation

For most users, the npx method above is recommended. Manual installation is useful for development or if you prefer a global install.

### Global Install via npm

```bash
npm install -g ai-usage-metrics-mcp
```

Then use `ai-usage-metrics-mcp` as the command in your MCP config instead of `npx`.

### From Source (for development)

```bash
# Clone the repository
git clone https://github.com/charlie-818/ai-history-mcp.git
cd ai-history-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run the server
npm start
```

### Package Manager Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled server |
| `npm run dev` | Watch mode for development |
| `npm test` | Run the test suite |
| `npm run test:coverage` | Run tests with coverage report |

### Verifying Installation

After installation, verify the server works:

```bash
# Test the server starts correctly
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"capabilities": {}}}' | node dist/index.js
```

You should see a JSON response with server capabilities.

---

## Usage

### Logging Model Calls

After each AI model invocation in your application, log the call:

```typescript
// Using MCP client
await mcpClient.callTool("log_model_call", {
  project: "my-chatbot",
  environment: "prod",
  sessionId: "session-abc-123",
  modelName: "claude-3-opus",
  inputMessages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" }
  ],
  outputMessages: [
    { role: "assistant", content: "The capital of France is Paris." }
  ],
  tokensIn: 45,
  tokensOut: 12,
  latencyMs: 234
});
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "stored": true
}
```

### Searching Calls

Find specific calls with flexible filtering:

```typescript
// Search by project and date range
const calls = await mcpClient.callTool("search_model_calls", {
  project: "my-chatbot",
  environment: "prod",
  from: "2024-01-01T00:00:00Z",
  to: "2024-01-31T23:59:59Z",
  limit: 100
});

// Search by user
const userCalls = await mcpClient.callTool("search_model_calls", {
  userId: "user-12345",
  modelName: "gpt-4"
});
```

### Session Management

Track conversations by grouping calls into sessions:

```typescript
// List all sessions for a project
const sessions = await mcpClient.callTool("list_sessions", {
  project: "my-chatbot",
  environment: "prod"
});

// Get all calls in a specific session
const sessionCalls = await mcpClient.callTool("get_session_calls", {
  sessionId: "session-abc-123"
});
```

**Session Summary Response:**
```json
{
  "sessionId": "session-abc-123",
  "project": "my-chatbot",
  "environment": "prod",
  "firstCallAt": "2024-01-15T10:30:00Z",
  "lastCallAt": "2024-01-15T10:45:00Z",
  "callCount": 8,
  "totalTokensIn": 1250,
  "totalTokensOut": 890,
  "avgLatencyMs": 245
}
```

### Aggregate Metrics

Get high-level usage statistics:

```typescript
// Get metrics for a project
const metrics = await mcpClient.callTool("get_aggregate_metrics", {
  project: "my-chatbot",
  environment: "prod",
  from: "2024-01-01T00:00:00Z",
  to: "2024-01-31T23:59:59Z"
});
```

**Response:**
```json
{
  "callCount": 15420,
  "totalTokensIn": 2450000,
  "totalTokensOut": 1890000,
  "avgLatencyMs": 312
}
```

---

## 📚 API Reference

### Tools

#### `log_model_call`

Log a model call for tracking.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | Yes | Project identifier |
| `environment` | string | No | Environment (default: "dev") |
| `userId` | string | No | User identifier |
| `sessionId` | string | No | Session identifier for grouping calls |
| `modelName` | string | Yes | Model name (e.g., "gpt-4", "claude-3-opus") |
| `modelVersion` | string | No | Model version |
| `promptType` | string | No | Type: "chat", "rag", "tool", "agent" |
| `inputMessages` | array | Yes | Input messages `[{role, content}]` |
| `outputMessages` | array | Yes | Output messages `[{role, content}]` |
| `retrievedContext` | array | No | RAG context `[{source, docId, hash?}]` |
| `latencyMs` | number | No | Call latency in milliseconds |
| `tokensIn` | number | No | Input token count |
| `tokensOut` | number | No | Output token count |
| `safety` | object | No | Safety result `{status, details?}` |
| `metrics` | object | No | Custom metrics key-value pairs |
| `traceId` | string | No | Distributed tracing ID |
| `requestId` | string | No | Provider request ID |

**Returns:** `{ id: string, stored: boolean }`

---

#### `search_model_calls`

Search logged calls with filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | No | Filter by project |
| `environment` | string | No | Filter by environment |
| `userId` | string | No | Filter by user |
| `modelName` | string | No | Filter by model |
| `from` | string | No | Start date (ISO format) |
| `to` | string | No | End date (ISO format) |
| `limit` | number | No | Max results (default: 50, max: 100) |

**Returns:** Array of `ModelCallLog` objects (message content truncated for safety)

---

#### `list_sessions`

List session summaries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | No | Filter by project |
| `environment` | string | No | Filter by environment |
| `limit` | number | No | Max results (default: 50, max: 100) |

**Returns:** Array of `SessionSummary` objects

---

#### `get_session_calls`

Get all calls for a session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session identifier |

**Returns:** Array of `ModelCallLog` objects (chronological order)

---

#### `get_aggregate_metrics`

Get aggregate metrics across calls.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | No | Filter by project |
| `environment` | string | No | Filter by environment |
| `from` | string | No | Start date (ISO format) |
| `to` | string | No | End date (ISO format) |

**Returns:** `{ callCount, totalTokensIn, totalTokensOut, avgLatencyMs? }`

---

### Resources

Resources provide read-only access via URI patterns:

| URI Pattern | Description |
|-------------|-------------|
| `ai-usage://calls/{id}` | Get a specific call by ID |
| `ai-usage://sessions/{sessionId}` | Get session summary and all calls |
| `ai-usage://metrics/aggregate?project=...&environment=...` | Get aggregate metrics |

**Example resource access:**
```typescript
// Get a specific call
const call = await mcpClient.readResource("ai-usage://calls/550e8400-e29b-41d4-a716-446655440000");

// Get session details
const session = await mcpClient.readResource("ai-usage://sessions/session-abc-123");

// Get filtered metrics
const metrics = await mcpClient.readResource(
  "ai-usage://metrics/aggregate?project=my-chatbot&environment=prod"
);
```

---

## Data Model

### ModelCallLog

```typescript
interface ModelCallLog {
  id: string;                    // Unique identifier (UUID)
  timestamp: string;             // ISO timestamp
  project: string;               // Project identifier
  environment: string;           // "dev" | "staging" | "prod" | custom
  userId?: string;               // Optional user identifier
  sessionId?: string;            // Optional session identifier
  modelName: string;             // Model name
  modelVersion?: string;         // Model version
  promptType?: string;           // "chat" | "rag" | "tool" | "agent" | custom
  inputMessages: Message[];      // Input messages
  outputMessages: OutputMessage[]; // Output messages
  retrievedContext?: RetrievedContext[]; // RAG context
  latencyMs?: number;            // Latency in milliseconds
  tokensIn?: number;             // Input tokens
  tokensOut?: number;            // Output tokens
  safety?: SafetyResult;         // Safety check result
  metrics?: Record<string, number | string>; // Custom metrics
  traceId?: string;              // Distributed tracing ID
  requestId?: string;            // Provider request ID
}
```

### SessionSummary

```typescript
interface SessionSummary {
  sessionId: string;
  project: string;
  environment: string;
  firstCallAt: string;           // ISO timestamp
  lastCallAt: string;            // ISO timestamp
  callCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  avgLatencyMs?: number;
}
```

### Message Types

```typescript
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface OutputMessage {
  role: "assistant" | "tool";
  content: string;
}

interface RetrievedContext {
  source: string;
  docId: string;
  hash?: string;
}

interface SafetyResult {
  status: "passed" | "flagged" | "blocked";
  details?: string;
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    src/index.ts                      │   │
│  │              Server wiring & handlers                │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         ▼                  ▼                  ▼            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │   Tools     │   │  Resources  │   │   Schema    │      │
│  │ src/tools/* │   │src/resources│   │ src/schema  │      │
│  └─────────────┘   └─────────────┘   └─────────────┘      │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            ▼                                │
│              ┌─────────────────────────┐                   │
│              │    MetricsStore         │                   │
│              │    Interface            │                   │
│              │    src/store.ts         │                   │
│              └─────────────────────────┘                   │
│                            │                                │
│              ┌─────────────┴─────────────┐                 │
│              ▼                           ▼                 │
│    ┌──────────────────┐      ┌──────────────────┐         │
│    │ InMemoryStore    │      │ PostgresStore    │         │
│    │ (included)       │      │ (extend)         │         │
│    └──────────────────┘      └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
ai-usage-metrics-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── schema.ts          # TypeScript type definitions
│   ├── store.ts           # Storage interface & in-memory implementation
│   ├── tools/
│   │   ├── index.ts       # Tool exports
│   │   ├── log-model-call.ts
│   │   ├── search-model-calls.ts
│   │   ├── list-sessions.ts
│   │   ├── get-session-calls.ts
│   │   └── get-aggregate-metrics.ts
│   └── resources/
│       └── index.ts       # Resource handlers
├── tests/
│   ├── fixtures.ts        # Test data factories
│   ├── store.test.ts
│   ├── resources.test.ts
│   ├── integration.test.ts
│   └── tools/
│       └── *.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Extending the Server

### Adding PostgreSQL Support

The `MetricsStore` interface makes it straightforward to add database support:

```typescript
// src/postgres-store.ts
import { Pool } from 'pg';
import { MetricsStore, ModelCallLog, SessionSummary, ... } from './schema.js';

export class PostgresMetricsStore implements MetricsStore {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async logCall(input: LogCallInput): Promise<ModelCallLog> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO model_calls (id, timestamp, project, ...) VALUES ($1, $2, $3, ...)`,
      [id, timestamp, input.project, ...]
    );

    return { id, timestamp, ...input };
  }

  async getCall(id: string): Promise<ModelCallLog | null> {
    const result = await this.pool.query(
      'SELECT * FROM model_calls WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Implement remaining methods...
}
```

### Database Schema (PostgreSQL)

```sql
CREATE TABLE model_calls (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  project VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  model_name VARCHAR(255) NOT NULL,
  model_version VARCHAR(50),
  prompt_type VARCHAR(50),
  input_messages JSONB NOT NULL,
  output_messages JSONB NOT NULL,
  retrieved_context JSONB,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  safety JSONB,
  metrics JSONB,
  trace_id VARCHAR(255),
  request_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_model_calls_project ON model_calls(project);
CREATE INDEX idx_model_calls_environment ON model_calls(environment);
CREATE INDEX idx_model_calls_session_id ON model_calls(session_id);
CREATE INDEX idx_model_calls_user_id ON model_calls(user_id);
CREATE INDEX idx_model_calls_timestamp ON model_calls(timestamp);
CREATE INDEX idx_model_calls_model_name ON model_calls(model_name);
```

### Adding Custom Metrics

Log custom metrics with any model call:

```typescript
await mcpClient.callTool("log_model_call", {
  project: "my-app",
  modelName: "gpt-4",
  inputMessages: [...],
  outputMessages: [...],
  metrics: {
    // Custom numeric metrics
    confidence_score: 0.95,
    relevance_score: 0.87,
    response_quality: 4.5,

    // Custom string metrics
    intent_category: "information_query",
    sentiment: "neutral",
    language: "en"
  }
});
```

---

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode (watch)
npm run dev
```

### Code Style

The project uses TypeScript with strict mode enabled. Key conventions:

- All types defined in `src/schema.ts`
- Tool implementations in separate files under `src/tools/`
- Input validation using Zod schemas
- Async/await for all asynchronous operations

---

## Testing

The project includes a comprehensive test suite with 220+ tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Test Coverage

| Category | Coverage |
|----------|----------|
| Statements | 97%+ |
| Branches | 98%+ |
| Functions | 95%+ |
| Lines | 97%+ |

### Test Structure

- **Unit Tests**: Individual components (store, tools, resources)
- **Integration Tests**: End-to-end workflows
- **Edge Cases**: Error handling, boundary conditions, concurrent operations

---

## Troubleshooting

### Common Issues

**Server not connecting:**
- Verify the path in your MCP client configuration is absolute
- Check that the server is built (`npm run build`)
- Ensure Node.js 18+ is installed

**Data not persisting:**
- The default in-memory store loses data on restart
- Implement a database-backed store for persistence

**High memory usage:**
- The in-memory store grows unbounded
- Implement pagination or data expiration for production use

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=mcp:* node dist/index.js
```

### Platform-Specific Issues

<details>
<summary><strong>Claude Desktop not detecting server</strong></summary>

1. Ensure the config file is valid JSON (no trailing commas)
2. Use absolute paths, not relative paths
3. Restart Claude Desktop after config changes
4. Check the Claude Desktop logs for errors

</details>

<details>
<summary><strong>Cursor MCP not loading</strong></summary>

1. Verify the config file location (`~/.cursor/mcp.json`)
2. Check Cursor's MCP status in the command palette
3. Ensure the server process can be executed by Cursor

</details>

<details>
<summary><strong>Windsurf connection issues</strong></summary>

1. Open Windsurf's Cascade settings
2. Verify the MCP server is listed and enabled
3. Check for any error messages in the Cascade panel

</details>

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

---

## Support

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/charlie-818/ai-history-mcp/issues)
- **Documentation**: See the [MCP specification](https://modelcontextprotocol.io/)
- **Discussions**: Join the conversation on [GitHub Discussions](https://github.com/charlie-818/ai-history-mcp/discussions)

---

<div align="center">

**[⬆ Back to Top](#ai-usage-metrics-mcp-server)**

Made with ❤️ for the AI developer community

</div>
