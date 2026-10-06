import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";

export type CommandDraftLike = InstanceType<typeof CommandCenterDraftModel>;

export type ApplyResult = {
  resourceType: string;
  resourceId: string;
  summary: Record<string, unknown>;
};

export const stableToken = (value: string, length = 12) =>
  createHash("sha256").update(value).digest("hex").slice(0, length);

export const stableObjectId = (value: string) =>
  new mongoose.Types.ObjectId(
    createHash("sha256").update(value).digest("hex").slice(0, 24),
  );

export const buildAliasMap = (items: any[]) => {
  const map = new Map<string, any>();
  for (const item of items) {
    for (const value of [item?.id, item?._id]) {
      const key = String(value || "").trim();
      if (key) map.set(key, item);
    }
  }
  return map;
};
