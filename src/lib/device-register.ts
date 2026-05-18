import { prisma } from "@/lib/prisma";

export async function registerBrowserDevice(input: {
  tenantId: string;
  fingerprint: string;
  name: string;
  kind?: "browser" | "kiosk";
}) {
  const kind = input.kind ?? "browser";
  const existing = await prisma.device.findFirst({
    where: {
      tenantId: input.tenantId,
      installFingerprint: input.fingerprint,
      status: "active",
    },
  });
  if (existing) {
    await prisma.device.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date(),
        kind,
        name: input.name,
      },
    });
    return { ok: true as const, deviceId: existing.id, reused: true as const };
  }

  const activeCount = await prisma.device.count({
    where: { tenantId: input.tenantId, status: "active" },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { deviceLimit: true },
  });
  const deviceLimit = tenant?.deviceLimit ?? 4;
  if (activeCount >= deviceLimit) {
    return { ok: false as const, status: 402 as const };
  }

  const created = await prisma.device.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      kind,
      installFingerprint: input.fingerprint,
      status: "active",
      lastSeenAt: new Date(),
    },
    select: { id: true },
  });

  return { ok: true as const, deviceId: created.id, reused: false as const };
}

