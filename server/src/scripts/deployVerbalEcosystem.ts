/**
 * @deprecated VERBAL26 destructive rebuild entrypoint.
 * Retained only so stale operational commands fail safely.
 */
export async function deployVerbalEcosystem(): Promise<never> {
  const legacyOverrideRequested = process.env.ALLOW_DESTRUCTIVE_VERBAL_REBUILD === "true";
  throw new Error(
    legacyOverrideRequested
      ? "Refusing destructive verbal rebuild: ALLOW_DESTRUCTIVE_VERBAL_REBUILD no longer bypasses VERBAL26 safety."
      : "deployVerbalEcosystem is retired. Use the verified VERBAL26 22/76 migration after approved-source recovery.",
  );
}
if (process.argv[1]?.endsWith("deployVerbalEcosystem.ts") || process.argv[1]?.endsWith("deployVerbalEcosystem.js")) {
  deployVerbalEcosystem().catch((error) => { console.error("VERBAL26 safety guard:", error); process.exit(1); });
}
