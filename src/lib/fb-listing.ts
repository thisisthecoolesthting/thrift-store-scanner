import type { Scan, Tenant } from "@prisma/client";
import templates from "@/content/fb-description-templates.json";

export type IdentifyResponse = {
  identify: {
    title: string;
    query: string;
    category: string;
    confidence: number;
    source: string;
  };
  comp: {
    median: number | null;
    sampleSize: number;
    source: string;
    fetchedAt: string;
  };
};

export type FbCategory =
  | "Apparel"
  | "Books"
  | "Electronics"
  | "Furniture"
  | "Home"
  | "Kids"
  | "Music"
  | "Tools"
  | "Toys"
  | "Sports"
  | "Other";

export type FbListingDraft = {
  title: string;
  category: FbCategory;
  priceCents: number;
  description: string;
  photoUrl: string;
};

type TenantLocation = Pick<Tenant, "name" | "storeAddress"> | null;

const FB_CATEGORY_MAP: Array<{ rx: RegExp; category: FbCategory }> = [
  { rx: /(jacket|coat|shirt|pants|jeans|dress|shoe|boot|hat|apparel|clothing|denim)/i, category: "Apparel" },
  { rx: /(book|novel|paperback|hardcover|magazine|manual|textbook)/i, category: "Books" },
  { rx: /(camera|phone|laptop|tablet|console|speaker|audio|headphones|electronic|tv)/i, category: "Electronics" },
  { rx: /(chair|table|desk|dresser|couch|sofa|nightstand|furniture|cabinet)/i, category: "Furniture" },
  { rx: /(lamp|decor|kitchen|cookware|pot|pan|plate|home|houseware|vase)/i, category: "Home" },
  { rx: /(kids|baby|infant|toddler|children|crib|stroller)/i, category: "Kids" },
  { rx: /(vinyl|record|guitar|instrument|music|cd|cassette|amp)/i, category: "Music" },
  { rx: /(tool|drill|saw|wrench|socket|garage|workshop|hardware)/i, category: "Tools" },
  { rx: /(toy|lego|puzzle|doll|game|action figure)/i, category: "Toys" },
  { rx: /(bike|bicycle|sports|fitness|workout|helmet|golf|baseball|basketball)/i, category: "Sports" },
];

export function mapToFbCategory(input?: string | null): FbCategory {
  const text = (input ?? "").trim();
  if (!text) return "Other";
  const hit = FB_CATEGORY_MAP.find((entry) => entry.rx.test(text));
  return hit?.category ?? "Other";
}

export function buildTitle(identifyResult: IdentifyResponse): string {
  const raw = identifyResult.identify.title || identifyResult.identify.query || "Thrift store item";
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 80) return cleaned;
  return `${cleaned.slice(0, 77).trimEnd()}...`;
}

function toSentenceCase(input: string): string {
  if (!input) return "Item";
  const trimmed = input.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function buildDescription(
  identifyResult: IdentifyResponse,
  scan: Pick<Scan, "identifyCategory">,
  tenant: TenantLocation,
  category: FbCategory,
): string {
  const itemTitle = identifyResult.identify.title || identifyResult.identify.query || "Pre-owned item";
  const condition = identifyResult.identify.confidence >= 0.8 ? "Good overall condition." : "Pre-owned condition; see photo for details.";
  const categoryContext = templates[category] ?? templates.Other;
  const location = tenant?.storeAddress?.trim() || tenant?.name?.trim() || "our shop";

  const paragraph1 = `${toSentenceCase(itemTitle)}. ${condition}`;
  const paragraph2 = categoryContext;
  const paragraph3 = `Available now at ${location}. Message to coordinate local pickup.`;

  const text = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;
  if (text.length <= 1000) return text;
  return `${text.slice(0, 997).trimEnd()}...`;
}

export function generateFbListing(
  scan: Pick<Scan, "identifyTitle" | "identifyCategory" | "compMedian" | "imageUrl">,
  identifyResult: IdentifyResponse,
  tenant: TenantLocation,
): FbListingDraft {
  const category = mapToFbCategory(identifyResult.identify.category || scan.identifyCategory);
  const lowFromComp = scan.compMedian != null ? Math.max(1, Math.round(scan.compMedian * 100 * 0.8)) : null;
  const fallbackFromCompResponse =
    identifyResult.comp.median != null ? Math.max(1, Math.round(identifyResult.comp.median * 100 * 0.8)) : null;
  const priceCents = lowFromComp ?? fallbackFromCompResponse ?? 1000;

  return {
    title: buildTitle(identifyResult),
    category,
    priceCents,
    description: buildDescription(identifyResult, scan, tenant, category),
    photoUrl: scan.imageUrl ?? "",
  };
}
