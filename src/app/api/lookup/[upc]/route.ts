import { NextResponse } from "next/server";
import { lookupCompByUpc } from "@/lib/lookup";
import { scoreFlip } from "@/lib/score";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { readDeviceCookieId } from "@/lib/device-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ upc: string }> },
) {
  const { upc } = await params;
  if (!upc || !/^\d{8,14}$/.test(upc)) {
    return NextResponse.json({ error: "upc must be 8-14 digits" }, { status: 400 });
  }
  const url = new URL(req.url);
  const costBasis = Number(url.searchParams.get("costBasis") ?? "0") || 0;

  const result = await lookupCompByUpc(upc);
  const score = scoreFlip({
    compMedian: result.median,
    compSampleSize: result.sampleSize,
    costBasis,
    confidence: 0.95, // barcode IDs are essentially certain
  });

  let scanId: string | undefined;
  const session = await getSession();
  if (session) {
    const deviceId = await readDeviceCookieId();
    const created = await prisma.scan.create({
      data: {
        tenantId: session.tenantId,
        userId: session.userId,
        deviceId,
        identifyTitle: result.title,
        identifyCategory: "barcode",
        identifyConfidence: 0.95,
        compMedian: result.median,
        compSampleSize: result.sampleSize,
        compSource: result.source,
        verdict: score.verdict,
        costBasis,
        netUsd: score.netUsd,
        scoreNumeric: score.score,
      },
      select: { id: true },
    });
    if (deviceId) {
      await prisma.device.updateMany({
        where: { id: deviceId, tenantId: session.tenantId },
        data: { lastSeenAt: new Date() },
      });
    }
    scanId = created.id;
  }

  return NextResponse.json({
    identify: { title: result.title, query: result.query, category: "barcode", confidence: 0.95, source: "barcode" },
    comp: { median: result.median, sampleSize: result.sampleSize, source: result.source, fetchedAt: result.fetchedAt },
    score,
    costBasis,
    scanId,
  });
}
