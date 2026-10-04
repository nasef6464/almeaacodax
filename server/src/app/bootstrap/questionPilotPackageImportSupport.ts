import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { UserModel } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

export const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

export const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

export const pool = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) => {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const run = async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      run,
    ),
  );
  return results;
};

export const requireEnv = (name: string) => {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required for COL26OLD import`);
  return value;
};

const parseCookie = (header: string, name: string) => {
  const match = String(header || "").match(new RegExp(`${name}=([^;]+)`));
  return String(match?.[1] || "").trim();
};

async function resolveAdminToken() {
  const admin = await UserModel.findOne({
    role: "admin",
    isActive: { $ne: false },
  })
    .select(
      "_id email name role schoolId groupIds linkedStudentIds managedPathIds managedSubjectIds",
    )
    .lean() as any;
  if (!admin) {
    throw new Error("No active admin account is available for controlled import");
  }

  return signAccessToken({
    id: String(admin._id),
    email: String(admin.email || ""),
    role: "admin",
    name: String(admin.name || "Admin"),
    schoolId: admin.schoolId || undefined,
    groupIds: Array.isArray(admin.groupIds) ? admin.groupIds.map(String) : [],
    linkedStudentIds: Array.isArray(admin.linkedStudentIds)
      ? admin.linkedStudentIds.map(String)
      : [],
    managedPathIds: Array.isArray(admin.managedPathIds)
      ? admin.managedPathIds.map(String)
      : [],
    managedSubjectIds: Array.isArray(admin.managedSubjectIds)
      ? admin.managedSubjectIds.map(String)
      : [],
  });
}

export async function createLocalApiClient() {
  const token = await resolveAdminToken();
  const base = `http://127.0.0.1:${env.PORT}/api`;
  let csrfToken = "";
  let csrfCookie = "";

  const refreshCsrf = async () => {
    const response = await fetch(`${base}/auth/csrf-token`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`CSRF HTTP ${response.status}`);
    const body = (await response.json()) as any;
    csrfToken = String(body?.csrfToken || "").trim();
    csrfCookie = parseCookie(
      response.headers.get("set-cookie") || "",
      "almeaa_csrf_token",
    );
    if (!csrfToken || !csrfCookie) {
      throw new Error("CSRF context unavailable");
    }
  };

  await refreshCsrf();

  return async (method: string, route: string, body?: unknown) => {
    const upper = method.toUpperCase();
    const write = !["GET", "HEAD", "OPTIONS"].includes(upper);
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (write) {
      headers["x-csrf-token"] = csrfToken;
      headers.cookie = `almeaa_csrf_token=${csrfCookie}`;
    }

    let response = await fetch(`${base}${route}`, {
      method: upper,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });

    if (response.status === 403 && write) {
      await refreshCsrf();
      headers["x-csrf-token"] = csrfToken;
      headers.cookie = `almeaa_csrf_token=${csrfCookie}`;
      response = await fetch(`${base}${route}`, {
        method: upper,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    }

    const raw = await response.text();
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { raw: raw.slice(0, 500) };
    }
    if (!response.ok) {
      throw new Error(
        `${upper} ${route} HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 1200)}`,
      );
    }
    return payload;
  };
}

export async function verifyLiveImages(questions: any[]) {
  if (!questions.length) return 0;
  const indexes = new Set<number>();
  const samples = Math.min(30, questions.length);
  for (let i = 0; i < samples; i += 1) {
    indexes.add(
      Math.floor((i * (questions.length - 1)) / Math.max(1, samples - 1)),
    );
  }

  let verified = 0;
  for (const index of [...indexes].sort((a, b) => a - b)) {
    const question = questions[index];
    const url = String(question?.imageUrl || "");
    const expectedHash = String(
      question?.sourceMeta?.imageHash || "",
    ).toLowerCase();
    if (!url || !expectedHash) {
      throw new Error(
        `Missing live image identity for ${question?.questionCode || index}`,
      );
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `Live image GET failed for ${question.questionCode}: HTTP ${response.status}`,
      );
    }
    const actualHash = sha256(Buffer.from(await response.arrayBuffer()));
    if (actualHash !== expectedHash) {
      throw new Error(`Live image hash mismatch for ${question.questionCode}`);
    }
    verified += 1;
  }
  return verified;
}
