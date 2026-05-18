import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  fbListingPatchSchema,
  fbListingPostSchema,
} from "@/lib/api-schemas";
import { generateFbListing, type IdentifyResponse } from "@/lib/fb-listing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOwnedScan(scanId: string, tenantId: string) {
  return prisma.scan.findFirst({
    where: { id: scanId, tenantId },
    include: { tenant: true },
  });
}

function draftFromScan(scan: {
  fbListingTitle: string | null;
  fbListingCategory: string | null;
  fbListingPriceCents: number | null;
  fbListingDescription: string | null;
  imageUrl: string | null;
}) {
  if (!scan.fbListingTitle || !scan.fbListingCategory || !scan.fbListingPriceCents || !scan.fbListingDescription) {
    return null;
  }

  return {
    title: scan.fbListingTitle,
    category: scan.fbListingCategory,
    priceCents: scan.fbListingPriceCents,
    description: scan.fbListingDescription,
    photoUrl: scan.imageUrl ?? "",
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const scan = await getOwnedScan(id, session.tenantId);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  let draft = draftFromScan(scan);
  if (!draft) {
    const identifySeed: IdentifyResponse = {
      identify: {
        title: scan.identifyTitle ?? "Thrift store item",
        query: scan.identifyTitle ?? "thrift store item",
        category: scan.identifyCategory ?? "Other",
        confidence: scan.identifyConfidence ?? 0.5,
        source: "scan",
      },
      comp: {
        median: scan.compMedian,
        sampleSize: scan.compSampleSize ?? 0,
        source: scan.compSource ?? "scan",
        fetchedAt: scan.scannedAt.toISOString(),
      },
    };
    draft = generateFbListing(scan, identifySeed, scan.tenant);
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        fbListingTitle: draft.title,
        fbListingCategory: draft.category,
        fbListingPriceCents: draft.priceCents,
        fbListingDescription: draft.description,
        fbListingStatus: "draft",
      },
    });
  }
  return NextResponse.json({
    scanId: scan.id,
    status: scan.fbListingStatus ?? "draft",
    draft,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const scan = await getOwnedScan(id, session.tenantId);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = fbListingPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const identifySeed: IdentifyResponse = {
    identify: {
      title: scan.identifyTitle ?? "Thrift store item",
      query: scan.identifyTitle ?? "thrift store item",
      category: scan.identifyCategory ?? "Other",
      confidence: scan.identifyConfidence ?? 0.5,
      source: "scan",
    },
    comp: {
      median: scan.compMedian,
      sampleSize: scan.compSampleSize ?? 0,
      source: scan.compSource ?? "scan",
      fetchedAt: scan.scannedAt.toISOString(),
    },
  };

  const generated = generateFbListing(scan, identifySeed, scan.tenant);
  const merged = {
    ...generated,
    ...parsed.data,
  };

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      fbListingTitle: merged.title,
      fbListingCategory: merged.category,
      fbListingPriceCents: merged.priceCents,
      fbListingDescription: merged.description,
      fbListingStatus: "draft",
    },
  });

  return NextResponse.json({
    scanId: scan.id,
    status: "draft",
    draft: merged,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const scan = await getOwnedScan(id, session.tenantId);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = fbListingPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const status = parsed.data.status;
  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      fbListingStatus: status,
      fbListingPostedAt:
        status === "posted" || status === "sold"
          ? scan.fbListingPostedAt ?? new Date()
          : null,
    },
  });

  return NextResponse.json({ scanId: scan.id, status });
}
