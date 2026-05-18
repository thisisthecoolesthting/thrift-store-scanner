import { z } from "zod";

/** POST /api/identify */
export const identifyBodySchema = z.object({
  imageBase64: z.string().min(32, "imageBase64 required"),
  costBasis: z.coerce.number().finite().nonnegative().optional(),
});

/** GET /api/billing/checkout?tier=… */
export const checkoutTierSchema = z.enum([
  "week_pass",
  "pro_monthly",
  "pro_annual",
  "founders_lifetime",
  "device_addon",
]);

export const checkoutBodySchema = z.object({
  tier: checkoutTierSchema,
  quantity: z.coerce.number().int().min(1).max(20).optional(),
});

export const fbListingPostSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  category: z
    .enum(["Apparel", "Books", "Electronics", "Furniture", "Home", "Kids", "Music", "Tools", "Toys", "Sports", "Other"])
    .optional(),
  priceCents: z.coerce.number().int().min(1).max(10_000_000).optional(),
  description: z.string().trim().min(1).max(1000).optional(),
  photoUrl: z.string().optional(),
});

export const fbListingPatchSchema = z.object({
  status: z.enum(["draft", "copied", "posted", "sold"]),
});
