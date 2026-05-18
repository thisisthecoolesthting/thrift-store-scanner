import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEVICE_ID_COOKIE } from "@/lib/device-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const now = new Date();
  const pairToken = await prisma.devicePairToken.findUnique({
    where: { token },
  });
  if (!pairToken || pairToken.consumedAt || pairToken.expiresAt <= now) {
    return NextResponse.json({ error: "Pair token is expired or already used." }, { status: 410 });
  }

  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const fallbackName = pairToken.deviceKind === "kiosk" ? "Kiosk browser" : "Paired phone";
  const name = pairToken.deviceName || deriveNameFromUa(ua) || fallbackName;
  const fingerprint = `pair-${pairToken.token}`;

  const activeCount = await prisma.device.count({
    where: { tenantId: pairToken.tenantId, status: "active" },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { id: pairToken.tenantId },
    select: { deviceLimit: true },
  });
  const deviceLimit = tenant?.deviceLimit ?? 4;
  if (activeCount >= deviceLimit) {
    return NextResponse.json(
      {
        error:
          "You&apos;re at your 4-installs limit. Add another for $15/mo or revoke an existing device at /admin/devices.",
      },
      { status: 402 },
    );
  }

  const created = await prisma.device.create({
    data: {
      tenantId: pairToken.tenantId,
      name,
      kind: pairToken.deviceKind,
      installFingerprint: fingerprint,
      status: "active",
      lastSeenAt: now,
    },
    select: { id: true },
  });

  await prisma.devicePairToken.update({
    where: { id: pairToken.id },
    data: { consumedAt: now },
  });

  const jar = await cookies();
  jar.set({
    name: DEVICE_ID_COOKIE,
    value: created.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({
    ok: true,
    deviceId: created.id,
    tenantId: pairToken.tenantId,
  });
}

function deriveNameFromUa(ua: string): string | null {
  if (!ua) return null;
  const isAndroid = /Android/i.test(ua);
  const isiOS = /iPhone|iPad|iOS/i.test(ua);
  const isChrome = /Chrome\/\d+/i.test(ua);
  const isSafari = /Safari\/\d+/i.test(ua) && !isChrome;
  const isFirefox = /Firefox\/\d+/i.test(ua);
  const browser = isChrome ? "Chrome" : isFirefox ? "Firefox" : isSafari ? "Safari" : "Browser";
  const device = isAndroid ? "Android" : isiOS ? "iOS" : "Device";
  return `${device} ${browser}`.trim();
}

