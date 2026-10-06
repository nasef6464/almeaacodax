import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = String(
  process.env.ALMEAA_MCP_LIVE_BASE_URL || "https://almeaacodax-codex.onrender.com",
).replace(/\/$/, "");
const endpoint = `${base}/api/command-center/mcp`;
const protocol = "2026-07-28";

const post = async (method, params = {}) => {
  const headers = {
    "content-type": "application/json",
    "mcp-protocol-version": protocol,
    "mcp-method": method,
  };
  if (method === "tools/call" && params.name) headers["mcp-name"] = params.name;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: method,
      method,
      params: {
        ...params,
        _meta: {
          ...(params._meta || {}),
          "io.modelcontextprotocol/protocolVersion": protocol,
        },
      },
    }),
  });
  const body = await response.json();
  return { response, body };
};

const metadataResponse = await fetch(
  `${base}/.well-known/oauth-protected-resource/api/command-center/mcp`,
  { headers: { accept: "application/json" } },
);
assert.equal(metadataResponse.status, 200, "OAuth protected-resource metadata must be live");
assert.match(
  String(metadataResponse.headers.get("content-type") || ""),
  /application\/json/i,
  "OAuth protected-resource metadata must be JSON",
);
const metadata = await metadataResponse.json();
assert.equal(metadata.resource, endpoint, "MCP metadata resource must match the live endpoint");
assert.ok(
  Array.isArray(metadata.authorization_servers) && metadata.authorization_servers.length > 0,
  "Production OAuth issuer must be configured before MCP certification can close",
);
assert.ok(
  Array.isArray(metadata.scopes_supported) && metadata.scopes_supported.includes("almeaa:admin"),
  "Production MCP metadata must advertise almeaa:admin",
);

const discovered = await post("server/discover");
assert.equal(discovered.response.status, 200);
assert.ok(
  discovered.body?.result?.supportedVersions?.includes(protocol),
  "Modern MCP protocol must be discoverable",
);

const listed = await post("tools/list");
assert.equal(listed.response.status, 200);
const tools = listed.body?.result?.tools || [];
const names = tools.map((tool) => String(tool?.name || ""));
for (const required of [
  "get_profile",
  "get_skill_tree",
  "get_course_inventory",
  "list_drafts",
  "create_question_drafts",
  "create_quiz_draft",
  "create_course_draft",
  "create_school_setup_draft",
  "plan_workflow",
  "get_workflow",
  "execute_workflow",
  "create_developer_task_draft",
  "get_developer_task_handoff",
]) {
  assert.ok(names.includes(required), `Missing live MCP tool: ${required}`);
}
for (const forbiddenPrefix of ["approve_", "apply_", "publish_", "delete_", "merge_", "deploy_"]) {
  assert.equal(
    names.some((name) => name.startsWith(forbiddenPrefix)),
    false,
    `Forbidden live MCP authority exposed: ${forbiddenPrefix}*`,
  );
}

const unauthenticated = await post("tools/call", {
  name: "get_profile",
  arguments: {},
});
assert.equal(unauthenticated.response.status, 200);
assert.ok(
  String(unauthenticated.response.headers.get("www-authenticate") || "").includes("resource_metadata"),
  "Unauthenticated tool call must advertise protected-resource metadata",
);
assert.equal(
  Boolean(unauthenticated.body?.result?.isError),
  true,
  "Unauthenticated MCP tool calls must fail closed",
);

const evidence = {
  checkedAt: new Date().toISOString(),
  endpoint,
  resource: metadata.resource,
  authorizationServersConfigured: metadata.authorization_servers.length,
  scopesSupported: metadata.scopes_supported,
  protocol,
  toolCount: names.length,
  tools: names,
  forbiddenAuthorityExposed: false,
  unauthenticatedChallenge: true,
};
await mkdir("audit-artifacts/command-center-mcp-live", { recursive: true });
await writeFile(
  "audit-artifacts/command-center-mcp-live/summary.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
console.log("ALMEAA Remote MCP live certification: PASS");
