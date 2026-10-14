import type { Schema } from "mongoose";

/** Keep literal string lookups eligible for the declared partial index. */
export const addCommandIdempotencyLookup = (schema: Schema) => {
  schema.pre(["find", "findOne"], function () {
    const filter = this.getFilter();
    if (typeof filter.idempotencyKey === "string") {
      this.setQuery({
        ...filter,
        idempotencyKey: { $eq: filter.idempotencyKey, $type: "string" },
      });
    }
  });
};
