import {z} from 'zod';

export const optionalRequestField = <Field extends z.core.$ZodType>(schema: Field) => z.union([z.undefined(),schema]).optional();

/** Keep PATCH omission semantics: an absent field must not apply the CREATE default. */
export function partialRequestSchema<Shape extends z.ZodRawShape, Config extends z.core.$ZodObjectConfig>(schema: z.ZodObject<Shape, Config>) {
  const shape = Object.fromEntries(Object.entries(schema.shape).map(([key,value]) => [key,optionalRequestField(value)])) as {
    [Key in keyof Shape]: z.ZodOptional<z.ZodUnion<[z.ZodUndefined, Shape[Key]]>>;
  };
  // extend preserves the original unknown-key policy (strip/strict/passthrough).
  return schema.extend(shape);
}
