import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const pairTokenSchema = z.object({
  deviceKind: z.enum(["phone", "browser", "kiosk"]).optional(),
  deviceName: z.string().trim().max(120).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {}

  const parsed = pairTokenSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const token = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.devicePairToken.create({
    data: {
      token,
      tenantId: session.tenantId,
      deviceKind: parsed.data.deviceKind ?? "phone",
      deviceName: parsed.data.deviceName?.trim() || null,
      expiresAt,
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://pricescout.pro";
  return NextResponse.json({
    ok: true,
    token,
    expiresAt: expiresAt.toISOString(),
    pairUrl: `${base.replace(/\/$/, "")}/api/devices/pair-token/${token}`,
  });
}

