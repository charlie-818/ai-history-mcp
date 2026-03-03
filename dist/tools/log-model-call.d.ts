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
export declare const logModelCallInputSchema: z.ZodObject<{
    project: z.ZodString;
    environment: z.ZodDefault<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    modelName: z.ZodString;
    modelVersion: z.ZodOptional<z.ZodString>;
    promptType: z.ZodOptional<z.ZodString>;
    inputMessages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant", "tool"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant" | "tool";
        content: string;
    }, {
        role: "system" | "user" | "assistant" | "tool";
        content: string;
    }>, "many">;
    retrievedContext: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        docId: z.ZodString;
        hash: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source: string;
        docId: string;
        hash?: string | undefined;
    }, {
        source: string;
        docId: string;
        hash?: string | undefined;
    }>, "many">>;
    outputMessages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["assistant", "tool"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "assistant" | "tool";
        content: string;
    }, {
        role: "assistant" | "tool";
        content: string;
    }>, "many">;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    tokensIn: z.ZodOptional<z.ZodNumber>;
    tokensOut: z.ZodOptional<z.ZodNumber>;
    safety: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<["passed", "flagged", "blocked"]>;
        details: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "passed" | "flagged" | "blocked";
        details?: string | undefined;
    }, {
        status: "passed" | "flagged" | "blocked";
        details?: string | undefined;
    }>>;
    metrics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    traceId: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    project: string;
    environment: string;
    modelName: string;
    inputMessages: {
        role: "system" | "user" | "assistant" | "tool";
        content: string;
    }[];
    outputMessages: {
        role: "assistant" | "tool";
        content: string;
    }[];
    userId?: string | undefined;
    sessionId?: string | undefined;
    modelVersion?: string | undefined;
    promptType?: string | undefined;
    retrievedContext?: {
        source: string;
        docId: string;
        hash?: string | undefined;
    }[] | undefined;
    latencyMs?: number | undefined;
    tokensIn?: number | undefined;
    tokensOut?: number | undefined;
    safety?: {
        status: "passed" | "flagged" | "blocked";
        details?: string | undefined;
    } | undefined;
    metrics?: Record<string, string | number> | undefined;
    traceId?: string | undefined;
    requestId?: string | undefined;
}, {
    project: string;
    modelName: string;
    inputMessages: {
        role: "system" | "user" | "assistant" | "tool";
        content: string;
    }[];
    outputMessages: {
        role: "assistant" | "tool";
        content: string;
    }[];
    environment?: string | undefined;
    userId?: string | undefined;
    sessionId?: string | undefined;
    modelVersion?: string | undefined;
    promptType?: string | undefined;
    retrievedContext?: {
        source: string;
        docId: string;
        hash?: string | undefined;
    }[] | undefined;
    latencyMs?: number | undefined;
    tokensIn?: number | undefined;
    tokensOut?: number | undefined;
    safety?: {
        status: "passed" | "flagged" | "blocked";
        details?: string | undefined;
    } | undefined;
    metrics?: Record<string, string | number> | undefined;
    traceId?: string | undefined;
    requestId?: string | undefined;
}>;
export type LogModelCallInput = z.infer<typeof logModelCallInputSchema>;
export interface LogModelCallResult {
    id: string;
    stored: boolean;
}
/**
 * Create the log_model_call tool handler
 */
export declare function createLogModelCallTool(store: MetricsStore): (input: unknown) => Promise<LogModelCallResult>;
export declare const logModelCallToolDefinition: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            project: {
                type: string;
                description: string;
            };
            environment: {
                type: string;
                description: string;
                default: string;
            };
            userId: {
                type: string;
                description: string;
            };
            sessionId: {
                type: string;
                description: string;
            };
            modelName: {
                type: string;
                description: string;
            };
            modelVersion: {
                type: string;
                description: string;
            };
            promptType: {
                type: string;
                description: string;
            };
            inputMessages: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        role: {
                            type: string;
                            enum: string[];
                        };
                        content: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            retrievedContext: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        source: {
                            type: string;
                        };
                        docId: {
                            type: string;
                        };
                        hash: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            outputMessages: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        role: {
                            type: string;
                            enum: string[];
                        };
                        content: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            latencyMs: {
                type: string;
                description: string;
            };
            tokensIn: {
                type: string;
                description: string;
            };
            tokensOut: {
                type: string;
                description: string;
            };
            safety: {
                type: string;
                description: string;
                properties: {
                    status: {
                        type: string;
                        enum: string[];
                    };
                    details: {
                        type: string;
                    };
                };
                required: string[];
            };
            metrics: {
                type: string;
                description: string;
                additionalProperties: {
                    oneOf: {
                        type: string;
                    }[];
                };
            };
            traceId: {
                type: string;
                description: string;
            };
            requestId: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
//# sourceMappingURL=log-model-call.d.ts.map