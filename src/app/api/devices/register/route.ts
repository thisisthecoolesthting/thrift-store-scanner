import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { DEVICE_ID_COOKIE } from "@/lib/device-constants";
import { guessDeviceNameFromHeaders } from "@/lib/device-utils";
import { registerBrowserDevice } from "@/lib/device-register";

const registerSchema = z.object({
  fingerprint: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(120).optional(),
  kind: z.enum(["browser", "kiosk"]).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ paired: false });
  }
  const jar = await cookies();
  const deviceId = jar.get(DEVICE_ID_COOKIE)?.value;
  if (!deviceId) {
    return NextResponse.json({ paired: false });
  }
  return NextResponse.json({ paired: true, deviceId });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required to pair this browser." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const preferredName = parsed.data.name?.trim() || (await guessDeviceNameFromHeaders());
  const reg = await registerBrowserDevice({
    tenantId: session.tenantId,
    fingerprint: parsed.data.fingerprint,
    name: preferredName,
    kind: parsed.data.kind ?? "browser",
  });

  if (!reg.ok) {
    return NextResponse.json(
      {
        error:
          "You&apos;re at your 4-installs limit. Add another for $15/mo or revoke an existing device at /admin/devices.",
      },
      { status: reg.status },
    );
  }

  const jar = await cookies();
  jar.set({
    name: DEVICE_ID_COOKIE,
    value: reg.deviceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({
    ok: true,
    deviceId: reg.deviceId,
    reused: reg.reused,
  });
}

