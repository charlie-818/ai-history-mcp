/**
 * Unit tests for list_sessions tool
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ZodError } from "zod";
import { InMemoryMetricsStore } from "../../src/store.js";
import {
  createListSessionsTool,
  listSessionsInputSchema,
} from "../../src/tools/list-sessions.js";
import {
  createSessionCallInputs,
  createMinimalLogCallInput,
  resetFixtureCounter,
  uniqueId,
} from "../fixtures.js";

describe("list_sessions tool", () => {
  let store: InMemoryMetricsStore;
  let listSessions: ReturnType<typeof createListSessionsTool>;

  beforeEach(async () => {
    store = new InMemoryMetricsStore();
    listSessions = createListSessionsTool(store);
    resetFixtureCounter();

    // Seed with sessions across different projects and environments
    const sessionConfigs = [
      { sessionId: "session-1", project: "project-a", environment: "prod" },
      { sessionId: "session-2", project: "project-a", environment: "dev" },
      { sessionId: "session-3", project: "project-b", environment: "prod" },
      { sessionId: "session-4", project: "project-b", environment: "staging" },
      { sessionId: "session-5", project: "project-c", environment: "dev" },
    ];

    for (const config of sessionConfigs) {
      const inputs = createSessionCallInputs(config.sessionId, 3, {
        project: config.project,
        environment: config.environment,
      });
      for (const input of inputs) {
        await store.logCall(input);
      }
    }
  });

  describe("input validation", () => {
    it("should accept empty input (no filters)", () => {
      const result = listSessionsInputSchema.parse({});
      expect(result).toBeDefined();
      expect(result.limit).toBe(50); // default
    });

    it("should accept all valid filter parameters", () => {
      const input = {
        project: "test-project",
        environment: "prod",
        limit: 25,
      };

      const result = listSessionsInputSchema.parse(input);

      expect(result.project).toBe("test-project");
      expect(result.environment).toBe("prod");
      expect(result.limit).toBe(25);
    });

    it("should reject limit of zero", () => {
      expect(() => listSessionsInputSchema.parse({ limit: 0 })).toThrow(ZodError);
    });

    it("should reject negative limit", () => {
      expect(() => listSessionsInputSchema.parse({ limit: -5 })).toThrow(ZodError);
    });

    it("should reject limit exceeding maximum", () => {
      expect(() => listSessionsInputSchema.parse({ limit: 101 })).toThrow(ZodError);
    });

    it("should accept limit at maximum boundary", () => {
      const result = listSessionsInputSchema.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it("should apply default limit when not specified", () => {
      const result = listSessionsInputSchema.parse({});
      expect(result.limit).toBe(50);
    });
  });

  describe("tool execution", () => {
    it("should list all sessions when no filters specified", async () => {
      const sessions = await listSessions({});
      expect(sessions).toHaveLength(5);
    });

    it("should filter by project", async () => {
      const sessions = await listSessions({ project: "project-a" });

      expect(sessions).toHaveLength(2);
      sessions.forEach((session) => {
        expect(session.project).toBe("project-a");
      });
    });

    it("should filter by environment", async () => {
      const sessions = await listSessions({ environment: "prod" });

      expect(sessions).toHaveLength(2);
      sessions.forEach((session) => {
        expect(session.environment).toBe("prod");
      });
    });

    it("should combine project and environment filters", async () => {
      const sessions = await listSessions({
        project: "project-a",
        environment: "prod",
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].project).toBe("project-a");
      expect(sessions[0].environment).toBe("prod");
    });

    it("should respect limit parameter", async () => {
      const sessions = await listSessions({ limit: 2 });
      expect(sessions).toHaveLength(2);
    });

    it("should return sessions sorted by lastCallAt descending", async () => {
      const sessions = await listSessions({});

      for (let i = 1; i < sessions.length; i++) {
        const prevTime = new Date(sessions[i - 1].lastCallAt).getTime();
        const currTime = new Date(sessions[i].lastCallAt).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it("should return empty array when no sessions match", async () => {
      const sessions = await listSessions({ project: "non-existent" });
      expect(sessions).toHaveLength(0);
    });
  });

  describe("session summary data", () => {
    it("should return correct callCount for each session", async () => {
      const sessions = await listSessions({});

      sessions.forEach((session) => {
        expect(session.callCount).toBe(3); // Each session has 3 calls
      });
    });

    it("should calculate totalTokensIn correctly", async () => {
      const sessions = await listSessions({});

      sessions.forEach((session) => {
        expect(session.totalTokensIn).toBeGreaterThan(0);
      });
    });

    it("should calculate totalTokensOut correctly", async () => {
      const sessions = await listSessions({});

      sessions.forEach((session) => {
        expect(session.totalTokensOut).toBeGreaterThan(0);
      });
    });

    it("should calculate avgLatencyMs when latency data available", async () => {
      const sessions = await listSessions({});

      sessions.forEach((session) => {
        expect(session.avgLatencyMs).toBeDefined();
        expect(session.avgLatencyMs).toBeGreaterThan(0);
      });
    });

    it("should set firstCallAt to earliest call timestamp", async () => {
      const sessions = await listSessions({});

      sessions.forEach((session) => {
        expect(session.firstCallAt).toBeDefined();
        expect(new Date(session.firstCallAt).getTime()).not.toBeNaN();
      });
    });

    it("should set lastCallAt to latest call timestamp", async () => {
      const sessions = await listSessions({});

      sessions.forEach((session) => {
        expect(session.lastCallAt).toBeDefined();
        expect(new Date(session.lastCallAt).getTime()).not.toBeNaN();
        expect(new Date(session.lastCallAt).getTime()).toBeGreaterThanOrEqual(
          new Date(session.firstCallAt).getTime()
        );
      });
    });

    it("should include all required fields in session summary", async () => {
      const sessions = await listSessions({ limit: 1 });
      const session = sessions[0];

      expect(session.sessionId).toBeDefined();
      expect(session.project).toBeDefined();
      expect(session.environment).toBeDefined();
      expect(session.firstCallAt).toBeDefined();
      expect(session.lastCallAt).toBeDefined();
      expect(typeof session.callCount).toBe("number");
      expect(typeof session.totalTokensIn).toBe("number");
      expect(typeof session.totalTokensOut).toBe("number");
    });
  });

  describe("edge cases", () => {
    it("should handle empty store gracefully", async () => {
      const emptyStore = new InMemoryMetricsStore();
      const emptyList = createListSessionsTool(emptyStore);

      const sessions = await emptyList({});
      expect(sessions).toHaveLength(0);
    });

    it("should not include calls without sessionId", async () => {
      // Add calls without sessionId
      for (let i = 0; i < 5; i++) {
        await store.logCall(
          createMinimalLogCallInput({
            project: "no-session-project",
            sessionId: undefined,
          })
        );
      }

      const sessions = await listSessions({ project: "no-session-project" });
      expect(sessions).toHaveLength(0);
    });

    it("should handle session with single call", async () => {
      const singleSessionId = uniqueId("single-session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId: singleSessionId,
          project: "single-call-project",
          tokensIn: 100,
          tokensOut: 50,
          latencyMs: 200,
        })
      );

      const sessions = await listSessions({ project: "single-call-project" });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].callCount).toBe(1);
      expect(sessions[0].totalTokensIn).toBe(100);
      expect(sessions[0].totalTokensOut).toBe(50);
      expect(sessions[0].avgLatencyMs).toBe(200);
      expect(sessions[0].firstCallAt).toBe(sessions[0].lastCallAt);
    });

    it("should handle sessions without latency data", async () => {
      const noLatencySession = uniqueId("no-latency-session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId: noLatencySession,
          project: "no-latency-project",
          latencyMs: undefined,
        })
      );

      const sessions = await listSessions({ project: "no-latency-project" });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].avgLatencyMs).toBeUndefined();
    });

    it("should handle sessions without token data", async () => {
      const noTokenSession = uniqueId("no-token-session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId: noTokenSession,
          project: "no-token-project",
          tokensIn: undefined,
          tokensOut: undefined,
        })
      );

      const sessions = await listSessions({ project: "no-token-project" });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].totalTokensIn).toBe(0);
      expect(sessions[0].totalTokensOut).toBe(0);
    });

    it("should handle special characters in filter values", async () => {
      const specialSession = uniqueId("special-session");
      await store.logCall(
        createMinimalLogCallInput({
          sessionId: specialSession,
          project: "project/with/special",
          environment: "env-test",
        })
      );

      const sessions = await listSessions({ project: "project/with/special" });
      expect(sessions).toHaveLength(1);
    });
  });
});
