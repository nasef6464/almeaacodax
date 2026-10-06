import { createPublicKey, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";
import type { CommandPrincipal } from "./commandAuthorization.js";

type OAuthDiscovery = {
  issuer?: string;
  jwks_uri?: string;
};

type Jwk = {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
};

type Jwks = { keys?: Jwk[] };

type McpProfile = {
  id: string;
  name?: string;
  email?: string;
};

type OAuthCache = {
  expiresAt: number;
  discovery: OAuthDiscovery;
  jwks: Jwks;
};

let oauthCache: OAuthCache | null = null;

const parseScopes = (value: unknown) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
  }
  return [
    ...new Set(
      String(value || "")
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
};

const constantTimeEquals = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

const requestOrigin = (req: Request) => {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "https";
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0]?.trim();
  const host = forwardedHost || req.get("host") || "";
  return `${proto}://${host}`.replace(/\/$/, "");
};

export const mcpResourceUrl = (req: Request) =>
  `${requestOrigin(req)}/api/command-center/mcp`;

export const mcpResourceMetadataUrl = (req: Request) =>
  `${requestOrigin(req)}/.well-known/oauth-protected-resource`;

export const buildMcpResourceMetadata = (req: Request) => ({
  resource: mcpResourceUrl(req),
  authorization_servers: [env.ALMEAA_MCP_OAUTH_ISSUER].filter(Boolean),
  scopes_supported: parseScopes(env.ALMEAA_MCP_OAUTH_SCOPES),
});

export class McpAuthError extends Error {
  statusCode = 401;
  requiredScopes: string[];

  constructor(message: string, requiredScopes: string[] = []) {
    super(message);
    this.name = "McpAuthError";
    this.requiredScopes = requiredScopes;
  }
}

export const buildMcpWwwAuthenticate = (req: Request, scopes: string[], error = "insufficient_scope") => {
  const scope = [...new Set(scopes.filter(Boolean))].join(" ");
  const description = error === "invalid_token"
    ? "A valid ALMEAA MCP OAuth access token is required"
    : "The OAuth token is missing one or more required ALMEAA MCP scopes";
  return `Bearer resource_metadata="${mcpResourceMetadataUrl(req)}", error="${error}", error_description="${description}"${scope ? `, scope="${scope}"` : ""}`;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`OAuth metadata request failed (${response.status})`);
    }
    const text = await response.text();
    if (text.length > 1_000_000) {
      throw new Error("OAuth metadata response exceeds size limit");
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizedIssuer = () => env.ALMEAA_MCP_OAUTH_ISSUER.replace(/\/$/, "");

const loadOAuthKeys = async () => {
  if (oauthCache && oauthCache.expiresAt > Date.now()) return oauthCache;

  const issuer = normalizedIssuer();
  if (!issuer) throw new McpAuthError("MCP OAuth issuer is not configured");

  let discovery: OAuthDiscovery;
  try {
    discovery = await fetchJson<OAuthDiscovery>(`${issuer}/.well-known/openid-configuration`);
  } catch {
    discovery = await fetchJson<OAuthDiscovery>(`${issuer}/.well-known/oauth-authorization-server`);
  }
  if (!discovery.jwks_uri || !/^https:\/\//i.test(discovery.jwks_uri)) {
    throw new McpAuthError("OAuth discovery does not expose a valid HTTPS jwks_uri");
  }
  if (discovery.issuer && discovery.issuer.replace(/\/$/, "") !== issuer) {
    throw new McpAuthError("OAuth issuer metadata mismatch");
  }

  const jwks = await fetchJson<Jwks>(discovery.jwks_uri);
  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new McpAuthError("OAuth JWKS does not contain signing keys");
  }

  oauthCache = {
    expiresAt: Date.now() + env.ALMEAA_MCP_JWKS_CACHE_MS,
    discovery,
    jwks,
  };
  return oauthCache;
};

const verifyOAuthToken = async (token: string) => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header) {
    throw new McpAuthError("Invalid OAuth access token");
  }

  const kid = String(decoded.header.kid || "").trim();
  const alg = String(decoded.header.alg || "").trim();
  if (!kid || !["RS256", "RS384", "RS512", "PS256", "PS384", "PS512"].includes(alg)) {
    throw new McpAuthError("Unsupported OAuth access-token signature");
  }

  const cache = await loadOAuthKeys();
  let jwk = cache.jwks.keys?.find((item) => String(item.kid || "") === kid);
  if (!jwk) {
    oauthCache = null;
    const refreshed = await loadOAuthKeys();
    jwk = refreshed.jwks.keys?.find((item) => String(item.kid || "") === kid);
  }
  if (!jwk) throw new McpAuthError("OAuth signing key not found");

  const key = createPublicKey({ key: jwk as JsonWebKey, format: "jwk" });
  const payload = jwt.verify(token, key, {
    algorithms: [alg as jwt.Algorithm],
    issuer: normalizedIssuer(),
    audience: env.ALMEAA_MCP_OAUTH_AUDIENCE,
  }) as jwt.JwtPayload;

  const subject = String(payload.sub || "").trim();
  if (!subject) throw new McpAuthError("OAuth token subject is missing");

  const scopes = [
    ...new Set([
      ...parseScopes(payload.scope),
      ...parseScopes(payload.scp),
      ...parseScopes(payload.permissions),
    ]),
  ];

  return {
    subject,
    scopes,
    profile: {
      id: subject,
      ...(payload.name ? { name: String(payload.name) } : {}),
      ...(payload.email ? { email: String(payload.email) } : {}),
    } satisfies McpProfile,
  };
};

export async function resolveMcpPrincipal(
  req: Request,
  requiredScopes: string[] = [],
): Promise<{ principal: CommandPrincipal; profile: McpProfile }> {
  if (!env.ALMEAA_MCP_ENABLED) {
    throw new McpAuthError("ALMEAA MCP is disabled");
  }

  const configuredKey = String(env.ALMEAA_COMMAND_API_KEY || "").trim();
  const providedKey = String(req.header("x-almeaa-command-key") || "").trim();
  if (configuredKey && providedKey && constantTimeEquals(configuredKey, providedKey)) {
    const scopes = parseScopes(env.ALMEAA_COMMAND_API_SCOPES);
    const missing = requiredScopes.filter((scope) => !scopes.includes("*") && !scopes.includes(scope));
    if (missing.length > 0) {
      throw new McpAuthError("Command API key is missing required scopes", missing);
    }
    return {
      principal: {
        id: "command-api-key",
        type: "api_key",
        source: "mcp",
        scopes,
      },
      profile: { id: "command-api-key", name: "ALMEAA Command API" },
    };
  }

  const authorization = String(req.header("authorization") || "");
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!bearer) {
    throw new McpAuthError("OAuth access token required", [
      env.ALMEAA_MCP_OAUTH_REQUIRED_SCOPE,
      ...requiredScopes,
    ].filter(Boolean));
  }

  const verified = await verifyOAuthToken(bearer);
  const required = [
    env.ALMEAA_MCP_OAUTH_REQUIRED_SCOPE,
    ...requiredScopes,
  ].filter(Boolean);
  const missing = required.filter((scope) => !verified.scopes.includes(scope));
  if (missing.length > 0) {
    throw new McpAuthError("OAuth token is missing required scopes", missing);
  }

  return {
    principal: {
      id: verified.subject,
      type: "oauth",
      source: "mcp",
      scopes: verified.scopes,
    },
    profile: verified.profile,
  };
}
