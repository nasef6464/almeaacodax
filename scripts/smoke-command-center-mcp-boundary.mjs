import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = String(
  process.env.MCP_BOUNDARY_BASE_URL || "https://almeaacodax-codex.onrender.com",
).replace(/\/$/, "");
const endpoint = `${base}/api/command-center/mcp`;
const metadataUrl = `${base}/.well-known/oauth-protected-resource/api/command-center/mcp`;
const protocol = "2026-07-28";

const metadataResponse = await fetch(metadataUrl, {
  headers: { accept: "application/json", "cache-control": "no-store" },
  signal: AbortSignal.timeout(12_000),
});

const evidence = {
  checkedAt: new Date().toISOString(),
  endpoint,
  metadataUrl,
  metadataStatus: metadataResponse.status,
  mode: "",
  failClosed: false,
  authorizationServersConfigured: 0,
  unauthenticatedChallenge: false,
  fullExternalProof: false,
};

if (metadataResponse.status === 404) {
  evidence.mode = "disabled";
  evidence.failClosed = true;
} else if (metadataResponse.status === 200) {
  evidence.mode = "enabled";
  const metadata = await metadataResponse.json();
  assert.equal(metadata.resource, endpoint, "MCP resource metadata must target the live endpoint");
  assert.ok(
    Array.isArray(metadata.authorization_servers) && metadata.authorization_servers.length > 0,
    "Enabled MCP must expose at least one authorization server",
  );
  assert.ok(
    Array.isArray(metadata.scopes_supported) && metadata.scopes_supported.includes("almeaa:admin"),
    "Enabled MCP must advertise almeaa:admin",
  );
  evidence.authorizationServersConfigured = metadata.authorization_servers.length;

  const unauthenticated = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "mcp-protocol-version": protocol,
      "mcp-method": "tools/call",
      "mcp-name": "get_profile",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "boundary-get-profile",
      method: "tools/call",
      params: {
        name: "get_profile",
        arguments: {},
        _meta: {
          "io.modelcontextprotocol/protocolVersion": protocol,
        },
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const unauthBody = await unauthenticated.json().catch(() => ({}));
  const challenge = String(unauthenticated.headers.get("www-authenticate") || "");
  assert.equal(unauthenticated.status, 200, "MCP tool auth challenge must use MCP JSON-RPC response");
  assert.ok(
    challenge.includes("resource_metadata"),
    "Unauthenticated MCP call must advertise protected-resource metadata",
  );
  assert.equal(
    Boolean(unauthBody?.result?.isError),
    true,
    "Unauthenticated MCP tool call must fail closed",
  );
  evidence.failClosed = true;
  evidence.unauthenticatedChallenge = true;
} else {
  throw new Error(`Unexpected MCP metadata status: ${metadataResponse.status}`);
}

await mkdir("audit-artifacts/command-center-mcp-boundary", { recursive: true });
await writeFile(
  "audit-artifacts/command-center-mcp-boundary/summary.json",
  JSON.stringify(evidence, null, 2) + "\n",
);

console.log(JSON.stringify(evidence, null, 2));
console.log(
  evidence.mode === "disabled"
    ? "ALMEAA MCP boundary: PASS (disabled and fail-closed; external proof still pending)"
    : "ALMEAA MCP boundary: PASS (enabled auth boundary; external client proof still separate)",
);
