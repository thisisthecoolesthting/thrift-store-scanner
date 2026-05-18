import type { SpineSixModel } from "@/components/marketing/SpineSixSections";

const commonTrust = [
  "Phones + browsers both count",
  "Android live · iOS in review",
  "Webcam works on any laptop",
];

export const INDUSTRY_SLUGS = [
  "thrift-stores",
  "estate-sales",
  "yard-sales",
  "consignment-shops",
  "flea-markets",
  "church-rummage-sales",
] as const;

export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];

const pages: Record<IndustrySlug, SpineSixModel> = {
  "thrift-stores": {
    eyebrow: "INDUSTRY SPOTLIGHT",
    title: "Thrift stores pricing donations without slowing the belt",
    subtitle:
      "Most thrift store crews use the phone for the floor and a back-room laptop with an overhead USB cam for the triage table. PriceScout works on both, and a single subscription covers both.",
    trustStrip: commonTrust,
    problem: {
      title: "Problem it solves",
      body: "Monday donations bury sorting rooms — crews lose afternoons debating mystery SKUs.",
    },
    audience: {
      title: "Who it is for",
      body: "Retail thrift nonprofits and resale boutiques rotating seasonal volunteers weekly.",
    },
    capabilities: [
      "Keeps backlog lanes flowing — scans beat clipboard hunts",
      "Aligns pricing philosophy across shifts",
      "Pairs tags with explanations shoppers trust",
      "Exports stewardship receipts nightly",
    ],
    steps: [
      "Unload pallets.",
      "Scan racks collaboratively.",
      "Publish pricing consistency donors recognize.",
      "Report donor dollars confidently.",
    ],
    faq: [
      {
        q: "Does pricing sync across chapters?",
        a: "Tenant-level defaults propagate everywhere logged-in managers approve.",
      },
    ],
    relatedFeatures: [
      { label: "Shared tag list", href: "/features/shared-flip-log" },
      { label: "Device management", href: "/features/device-management" },
    ],
    relatedIndustries: [
      { label: "Consignment shops", href: "/industries/consignment-shops" },
      { label: "Church rummage sales", href: "/industries/church-rummage-sales" },
    ],
    finalCta: {
      title: "Give thrift crews scanner reflexes",
      subtitle: "Train once — reuse everywhere donors drop bags.",
      pricingLine: "$29 Week Pass · $49/mo Pro · $699 Founders Lifetime (cap 100)",
    },
  },
  "estate-sales": {
    eyebrow: "INDUSTRY SPOTLIGHT",
    title: "Estate-sale crews tagging houses room-by-room",
    subtitle:
      "Estate sale crews walk a house — phones win. Buy a Week Pass for the weekend, scan everything, done.",
    trustStrip: commonTrust,
    problem: {
      title: "Problem it solves",
      body: "Pricing unfamiliar heirlooms live invites ugly markdown surprises Sunday afternoon.",
    },
    audience: {
      title: "Who it is for",
      body: "Professional estate planners coordinating onsite staging teams plus homeowner heirs approving sticker rails.",
    },
    capabilities: [
      "Reads pottery marks quickly",
      "Explains comps plainly for heirs negotiating splits",
      "Pairs verdict labels Buy/Maybe/Skip instantly",
      "Exports nightly summaries before liquidation auctions",
    ],
    steps: [
      "Photograph dining cabinet picks.",
      "Share verdicts via Shared tag list.",
      "Approve markdown tiers collaboratively.",
      "Leave homeowners calm receipts.",
    ],
    faq: [
      {
        q: "Wi-Fi flaky onsite?",
        a: "Vision caches progressively — hotspot tether keeps throughput acceptable.",
      },
    ],
    relatedFeatures: [
      { label: "Tag price suggestions", href: "/features/tag-price-suggestions" },
      { label: "Visual identification", href: "/features/visual-identification" },
    ],
    relatedIndustries: [
      { label: "Yard sales", href: "/industries/yard-sales" },
      { label: "Thrift stores", href: "/industries/thrift-stores" },
    ],
    finalCta: {
      title: "Finish houses Friday confident",
      subtitle: "Pricing cadence stays humane — markup debates shrink.",
      pricingLine: "$29 Week Pass · $49/mo Pro · $699 Founders Lifetime (cap 100)",
    },
  },
  "yard-sales": {
    eyebrow: "INDUSTRY SPOTLIGHT",
    title: "Weekend driveway crews sticker piles fast",
    subtitle:
      "Yard sales are phones-in-driveway. Get a Week Pass Friday night, tag the lawn Saturday morning.",
    trustStrip: commonTrust,
    problem: {
      title: "Problem it solves",
      body: "Saturday optimism tanks Sunday leftovers — sticker shocks scare neighbors.",
    },
    audience: {
      title: "Who it is for",
      body: "Families unloading garages plus neighborhood fundraisers stacking folding tables everywhere.",
    },
    capabilities: [
      "Runs entirely mobile-browser friendly",
      "Week Pass aligns with single-weekend bursts",
      "Outputs sticker-ready decimals instantly",
      "Explains skips politely when comps disagree",
    ],
    steps: [
      "Lay inventory visible.",
      "Scan bundles collaboratively.",
      "Price confidently before caffeine fades.",
      "Donate leftovers intentionally.",
    ],
    faq: [
      {
        q: "Works offline?",
        a: "Vision prefers connectivity — tether briefly before driveway crowds thicken.",
      },
    ],
    relatedFeatures: [
      { label: "Barcode fast path", href: "/features/barcode-fast-path" },
      { label: "Tag price suggestions", href: "/features/tag-price-suggestions" },
    ],
    relatedIndustries: [
      { label: "Flea markets", href: "/industries/flea-markets" },
      { label: "Estate sales", href: "/industries/estate-sales" },
    ],
    finalCta: {
      title: "Sunrise Saturdays feeling lighter",
      subtitle: "Sticker debates shrink — leftovers shrink slower.",
      pricingLine: "$29 Week Pass · $49/mo Pro · $699 Founders Lifetime (cap 100)",
    },
  },
  "consignment-shops": {
    eyebrow: "INDUSTRY SPOTLIGHT",
    title: "Consignment intake desks quoting confidently",
    subtitle:
      "Split percentages deserve comps owners recognize — transparency preserves loyalty.",
    trustStrip: commonTrust,
    problem: {
      title: "Problem it solves",
      body: "Walk-ins negotiate emotionally — spreadsheets rarely persuade skeptical consignors.",
    },
    audience: {
      title: "Who it is for",
      body: "Boutique consignment floors balancing intake throughput plus storytelling sellers.",
    },
    capabilities: [
      "Shows comps plainly before signing intake receipts",
      "Keeps verdict audit trails tidy",
      "Pairs barcode racks + vision aisles seamlessly",
      "Exports payout summaries cleanly",
    ],
    steps: [
      "Photograph intake pile.",
      "Align comps collaboratively.",
      "Sign mutually respectful splits.",
      "Merchandise confidently.",
    ],
    faq: [
      {
        q: "Handles designer handbags?",
        a: "Vision cues highlight stitching patterns — barcode absent scenarios shine.",
      },
    ],
    relatedFeatures: [
      { label: "Visual identification", href: "/features/visual-identification" },
      { label: "Flip log export", href: "/features/flip-log-export" },
    ],
    relatedIndustries: [
      { label: "Thrift stores", href: "/industries/thrift-stores" },
      { label: "Flea markets", href: "/industries/flea-markets" },
    ],
    finalCta: {
      title: "Protect margins politely",
      subtitle: "Owners trust receipts — sellers trust respectful counters.",
      pricingLine: "$29 Week Pass · $49/mo Pro · $699 Founders Lifetime (cap 100)",
    },
  },
  "flea-markets": {
    eyebrow: "INDUSTRY SPOTLIGHT",
    title: "Flea booths improvising sunrise setups",
    subtitle:
      "Flea market resellers work fast — phone-first. Some run a counter-top kiosk on a tablet for walk-up customer questions about pricing — use kiosk mode at /scan/kiosk.",
    trustStrip: commonTrust,
    problem: {
      title: "Problem it solves",
      body: "Outdoor glare hides scratches — guessing invites daylight regrets.",
    },
    audience: {
      title: "Who it is for",
      body: "Vendor crews rotating booths weekly plus artisans remixing thrift bundles creatively.",
    },
    capabilities: [
      "Reads textures despite tents glare",
      "Keeps verdict cadence conversational — shoppers tolerate sticker logic faster",
      "Pairs barcode racks near checkout crates",
      "Exports nightly tally summaries quickly",
    ],
    steps: [
      "Lay SKUs visibly.",
      "Scan aggressively opening hour.",
      "Sticker boldly before crowds thicken.",
      "Markdown consciously closing hour.",
    ],
    faq: [
      {
        q: "Works dusty?",
        a: "Encourage lens wipes hourly — algorithms tolerate moderate grime responsibly.",
      },
    ],
    relatedFeatures: [
      { label: "Shared tag list", href: "/features/shared-flip-log" },
      { label: "Tag price suggestions", href: "/features/tag-price-suggestions" },
    ],
    relatedIndustries: [
      { label: "Yard sales", href: "/industries/yard-sales" },
      { label: "Consignment shops", href: "/industries/consignment-shops" },
    ],
    finalCta: {
      title: "Sunrise booths sticker-ready",
      subtitle: "Confidence arrives before shoppers swarm aisles.",
      pricingLine: "$29 Week Pass · $49/mo Pro · $699 Founders Lifetime (cap 100)",
    },
  },
  "church-rummage-sales": {
    eyebrow: "INDUSTRY SPOTLIGHT",
    title: "Rummage volunteers pricing faithfully Sunday afternoon",
    subtitle:
      "Congregations prize stewardship narratives — comps anchor fairness politely.",
    trustStrip: commonTrust,
    problem: {
      title: "Problem it solves",
      body: "Volunteer rotations confuse tribal sticker lore — newcomers freeze politely.",
    },
    audience: {
      title: "Who it is for",
      body: "Parish halls stacking donated treasures yearly plus youth crews rotating hourly shifts politely.",
    },
    capabilities: [
      "Keeps pricing approachable congregation-wide",
      "Explains skips kindly — narratives stay conversational",
      "Pairs barcode textbooks automatically",
      "Exports treasurer summaries succinctly",
    ],
    steps: [
      "Lay fellowship hall treasures visibly.",
      "Train scanners collaboratively briefly.",
      "Sticker lovingly yet responsibly.",
      "Celebrate ministries sustainably.",
    ],
    faq: [
      {
        q: "Sensitive donor anonymity?",
        a: "Exports omit donor narratives intentionally — stewardship stays conversational verbally.",
      },
    ],
    relatedFeatures: [
      { label: "Device management", href: "/features/device-management" },
      { label: "Flip log export", href: "/features/flip-log-export" },
    ],
    relatedIndustries: [
      { label: "Thrift stores", href: "/industries/thrift-stores" },
      { label: "Yard sales", href: "/industries/yard-sales" },
    ],
    finalCta: {
      title: "Volunteers onboard politely",
      subtitle: "Treasurer spreadsheets reconcile cleanly.",
      pricingLine: "$29 Week Pass · $49/mo Pro · $699 Founders Lifetime (cap 100)",
    },
  },
};

export function getIndustryPage(slug: string): SpineSixModel | undefined {
  return pages[slug as IndustrySlug];
}

export function listIndustrySlugs(): IndustrySlug[] {
  return [...INDUSTRY_SLUGS];
}

