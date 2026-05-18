import * as Linking from "expo-linking";

export const FB_MARKETPLACE_WEB_URL = "https://www.facebook.com/marketplace/create/item";
const FB_MARKETPLACE_APP_URL = "fb://marketplace/create/item";

export type FbMobileCategory =
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

export interface FbMobileDraft {
  title: string;
  category: FbMobileCategory;
  priceCents: number;
  description: string;
  photoUrl: string;
}

export async function openFacebookMarketplaceComposer(): Promise<void> {
  try {
    const canOpenFb = await Linking.canOpenURL(FB_MARKETPLACE_APP_URL);
    if (canOpenFb) {
      await Linking.openURL(FB_MARKETPLACE_APP_URL);
      return;
    }
  } catch {
    // If app deep-link handling throws, fall through to web URL.
  }
  await Linking.openURL(FB_MARKETPLACE_WEB_URL);
}

export function buildListingCopy(draft: FbMobileDraft): string {
  return [
    `TITLE: ${draft.title}`,
    `CATEGORY: ${draft.category}`,
    `PRICE: $${(draft.priceCents / 100).toFixed(2)}`,
    "",
    "DESCRIPTION:",
    draft.description,
  ].join("\n");
}
