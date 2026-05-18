const API_BASE_URL = String(process.env.API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").trim();
const SMOKE_ADMIN_TOKEN = String(process.env.SMOKE_ADMIN_TOKEN || "").trim();

if (!SMOKE_ADMIN_TOKEN) {
  console.error("Missing SMOKE_ADMIN_TOKEN");
  process.exit(1);
}

const sentryTestUrl = `${API_BASE_URL.replace(/\/$/, "")}/operations/sentry/test-event`;

const response = await fetch(sentryTestUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SMOKE_ADMIN_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ source: "smoke-sentry-live-proof" }),
});

const text = await response.text();
let payload = null;
try {
  payload = JSON.parse(text);
} catch {
  payload = { raw: text };
}

if (response.status !== 202) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        step: "request",
        status: response.status,
        payload,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (!payload?.eventId) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        step: "event_id",
        message: "Response did not include eventId",
        payload,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      status: response.status,
      eventId: payload.eventId,
      message: "Sentry live proof emitted",
      endpoint: sentryTestUrl,
    },
    null,
    2,
  ),
);

