"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function renameDevice(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const id = String(formData.get("deviceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await prisma.device.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { name },
  });
  revalidatePath("/admin/devices");
}

export async function revokeDevice(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const id = String(formData.get("deviceId") ?? "");
  await prisma.device.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { status: "revoked" },
  });
  revalidatePath("/admin/devices");
}

export async function addDevice(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  const active = await prisma.device.count({
    where: { tenantId: session.tenantId, status: "active" },
  });
  const limit = tenant?.deviceLimit ?? 4;
  if (active >= limit) return;

  await prisma.device.create({
    data: {
      tenantId: session.tenantId,
      name,
      kind: "phone",
      installFingerprint: `web-${crypto.randomUUID()}`,
      status: "active",
      lastSeenAt: new Date(),
    },
  });
  revalidatePath("/admin/devices");
}
