import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../../../config/env.js";
import {
  buildMcpResourceMetadata,
  buildMcpWwwAuthenticate,
  McpAuthError,
  resolveMcpPrincipal,
} from "../application/mcpOAuth.js";
import {
  executeMcpTool,
  MCP_TOOL_SCOPES,
  mcpToolDescriptors,
} from "../application/mcpTools.js";

const MODERN_PROTOCOL = "2026-07-28";
const LEGACY_PROTOCOL = "2025-11-25";
const SERVER_INFO = { name: "almeaa-command-center", version: "1.0.0" };

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, any>;
};

const rpcError = (
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  data?: unknown,
) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: {
    code,
    message,
    ...(data === undefined ? {} : { data }),
  },
});

const modernResult = (id: JsonRpcRequest["id"], result: Record<string, unknown>) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result: {
    resultType: "complete",
    ...result,
    _meta: {
      ...((result._meta as Record<string, unknown> | undefined) || {}),
      "io.modelcontextprotocol/serverInfo": SERVER_INFO,
    },
  },
});

const legacyResult = (id: JsonRpcRequest["id"], result: Record<string, unknown>) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

const requestProtocol = (req: Request, message: JsonRpcRequest) =>
  String(
    req.header("mcp-protocol-version") ||
      message.params?._meta?.["io.modelcontextprotocol/protocolVersion"] ||
      "",
  ).trim();

const validateModernHeaders = (
  req: Request,
  message: JsonRpcRequest,
): string | null => {
  const protocol = requestProtocol(req, message);
  if (protocol !== MODERN_PROTOCOL) return null;

  const methodHeader = String(req.header("mcp-method") || "").trim();
  if (!methodHeader || methodHeader !== String(message.method || "")) {
    return "Mcp-Method header must match the JSON-RPC method";
  }

  if (message.method === "tools/call") {
    const nameHeader = String(req.header("mcp-name") || "").trim();
    const bodyName = String(message.params?.name || "").trim();
    if (!nameHeader || nameHeader !== bodyName) {
      return "Mcp-Name header must match params.name for tools/call";
    }
  }

  return null;
};

const toolResult = (
  req: Request,
  message: JsonRpcRequest,
  payload: unknown,
  modern: boolean,
) => {
  const structuredContent =
    payload && typeof payload === "object" ? payload : { value: payload };
  const result = {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
    isError: false,
  };
  return modern
    ? modernResult(message.id, result)
    : legacyResult(message.id, result);
};

const authToolResult = (
  req: Request,
  message: JsonRpcRequest,
  error: McpAuthError,
  modern: boolean,
) => {
  const challenge = buildMcpWwwAuthenticate(
    req,
    error.requiredScopes,
    /token|required/i.test(error.message) ? "invalid_token" : "insufficient_scope",
  );
  const result = {
    content: [{ type: "text", text: `Authentication required: ${error.message}` }],
    _meta: {
      "mcp/www_authenticate": [challenge],
    },
    isError: true,
  };
  return {
    challenge,
    body: modern
      ? modernResult(message.id, result)
      : legacyResult(message.id, result),
  };
};

export const mcpRouter = Router();

mcpRouter.get("/", (_req, res) => {
  res.setHeader("Allow", "POST");
  return res.status(405).json({ message: "Use MCP Streamable HTTP POST requests" });
});

mcpRouter.post("/", async (req: Request, res: Response, next) => {
  if (!env.ALMEAA_MCP_ENABLED) {
    return res.status(404).json({ message: "ALMEAA MCP is disabled" });
  }

  const message = (req.body || {}) as JsonRpcRequest;
  if (message.jsonrpc !== "2.0" || !message.method) {
    return res.status(400).json(rpcError(message.id, -32600, "Invalid Request"));
  }

  const protocol = requestProtocol(req, message);
  const modern = protocol === MODERN_PROTOCOL || message.method === "server/discover";
  if (protocol && protocol !== MODERN_PROTOCOL && protocol !== LEGACY_PROTOCOL) {
    return res.status(400).json(
      rpcError(message.id, -32022, "Unsupported protocol version", {
        supported: [MODERN_PROTOCOL, LEGACY_PROTOCOL],
      }),
    );
  }

  const headerError = validateModernHeaders(req, message);
  if (headerError) {
    return res.status(400).json(rpcError(message.id, -32020, "HeaderMismatch", {
      message: headerError,
    }));
  }

  try {
    if (message.method === "server/discover") {
      return res.json(
        modernResult(message.id, {
          supportedVersions: [MODERN_PROTOCOL],
          capabilities: { tools: {} },
          instructions:
            "ALMEAA Command Center exposes scoped educational administration tools. Reuse existing platform content first. External agents may read and create reviewable drafts/workflows, but cannot approve, apply, publish, delete, or bypass ALMEAA validation.",
          ttlMs: 60_000,
          cacheScope: "private",
        }),
      );
    }

    if (message.method === "initialize") {
      const requested = String(message.params?.protocolVersion || LEGACY_PROTOCOL);
      return res.json(
        legacyResult(message.id, {
          protocolVersion: requested === LEGACY_PROTOCOL ? LEGACY_PROTOCOL : LEGACY_PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
          instructions:
            "ALMEAA Command Center: read platform context and create reviewable drafts/workflows only.",
        }),
      );
    }

    if (message.method === "notifications/initialized") {
      return res.status(202).end();
    }

    if (message.method === "ping") {
      return res.json(
        modern ? modernResult(message.id, {}) : legacyResult(message.id, {}),
      );
    }

    if (message.method === "tools/list") {
      const result = {
        tools: mcpToolDescriptors,
        ...(modern ? { ttlMs: 60_000, cacheScope: "private" } : {}),
      };
      return res.json(
        modern
          ? modernResult(message.id, result)
          : legacyResult(message.id, result),
      );
    }

    if (message.method === "tools/call") {
      const name = String(message.params?.name || "").trim();
      const args =
        message.params?.arguments && typeof message.params.arguments === "object"
          ? (message.params.arguments as Record<string, unknown>)
          : {};
      if (!name || !Object.prototype.hasOwnProperty.call(MCP_TOOL_SCOPES, name)) {
        return res.status(400).json(
          rpcError(message.id, -32602, "Invalid params", {
            message: "Unknown or missing MCP tool name",
          }),
        );
      }

      let auth;
      try {
        auth = await resolveMcpPrincipal(req, MCP_TOOL_SCOPES[name] || []);
      } catch (error) {
        if (error instanceof McpAuthError) {
          const authResult = authToolResult(req, message, error, modern);
          res.setHeader("WWW-Authenticate", authResult.challenge);
          return res.json(authResult.body);
        }
        throw error;
      }

      try {
        const output = await executeMcpTool({
          name,
          args,
          principal: auth.principal,
          profile: auth.profile,
        });
        return res.json(toolResult(req, message, output, modern));
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Tool execution failed";
        const statusCode = Number((error as { statusCode?: number })?.statusCode || 500);
        const result = {
          content: [{ type: "text", text: messageText }],
          structuredContent: {
            ok: false,
            error: messageText,
            statusCode,
          },
          isError: true,
        };
        return res.json(
          modern
            ? modernResult(message.id, result)
            : legacyResult(message.id, result),
        );
      }
    }

    return res.status(404).json(rpcError(message.id, -32601, "Method not found"));
  } catch (error) {
    return next(error);
  }
});

export const mcpProtectedResourceMetadataHandler = (req: Request, res: Response) => {
  if (!env.ALMEAA_MCP_ENABLED) {
    return res.status(404).json({ message: "ALMEAA MCP is disabled" });
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.json(buildMcpResourceMetadata(req));
};
