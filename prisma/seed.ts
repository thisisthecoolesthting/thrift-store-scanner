/**
 * Seed PriceScout demo tenant — run after migrate against Postgres.
 * `npx prisma db seed`
 *
 * Demo login (all seeded users): SEED_DEMO_PASSWORD env or `demo-password!`
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PW = process.env.SEED_DEMO_PASSWORD ?? "demo-password!";

function pwHash(): string {
  return bcrypt.hashSync(DEMO_PW, 10);
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-thrift" },
    update: {},
    create: {
      name: "Demo Thrift Store",
      slug: "demo-thrift",
      subscriptionStatus: "trialing",
      deviceLimit: 4,
    },
  });

  const people = [
    { email: "maria.rodriguez@example.com", name: "Maria Rodriguez", role: "OWNER" },
    { email: "marcus.johnson@example.com", name: "Marcus Johnson", role: "STAFF" },
    { email: "sarah.chen@example.com", name: "Sarah Chen", role: "STAFF" },
    { email: "david.park@example.com", name: "David Park", role: "STAFF" },
    { email: "jamal.williams@example.com", name: "Jamal Williams", role: "STAFF" },
  ];

  const hash = pwHash();
  const users = [];
  for (const p of people) {
    users.push(
      await prisma.user.upsert({
        where: { email: p.email },
        update: { passwordHash: hash },
        create: {
          email: p.email,
          name: p.name,
          role: p.role,
          passwordHash: hash,
          tenantId: tenant.id,
        },
      }),
    );
  }

  await prisma.invite.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.scan.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.device.deleteMany({ where: { tenantId: tenant.id } });

  const devices = [];
  for (let i = 0; i < users.length; i++) {
    devices.push(
      await prisma.device.create({
        data: {
          tenantId: tenant.id,
          name: `Scanner ${i + 1} — ${users[i].name.split(" ")[0]}`,
          kind: i >= 3 ? "browser" : "phone",
          installFingerprint: `seed-fp-${i}`,
          status: "active",
          lastSeenAt: new Date(),
        },
      }),
    );
  }

  const verdicts = ["buy", "maybe", "skip"];
  const titles = ["Pyrex loaf pan", "Levi's 501", "Vintage Polaroid", "Stanley mug", "Carhartt jacket"];

  for (let d = 0; d < 7; d++) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    for (let n = 0; n < 4; n++) {
      const owner = users[(d + n) % users.length];
      await prisma.scan.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          deviceId: devices[n % devices.length].id,
          identifyTitle: titles[(d + n) % titles.length],
          identifyCategory: "household",
          identifyConfidence: 0.65 + (n % 3) * 0.1,
          compMedian: 12 + ((d + n) % 10) * 3.5,
          compSampleSize: 5 + ((d + n) % 12),
          compSource: "mock",
          verdict: verdicts[(d + n) % verdicts.length],
          costBasis: 4 + n,
          netUsd: 8 + n,
          scoreNumeric: 0.72,
          scannedAt: day,
        },
      });
    }
  }

  let extra = 0;
  while ((await prisma.scan.count({ where: { tenantId: tenant.id } })) < 25) {
    await prisma.scan.create({
      data: {
        tenantId: tenant.id,
        userId: users[0].id,
        deviceId: devices[0].id,
        identifyTitle: `Extra lot ${extra}`,
        compMedian: 20,
        compSampleSize: 8,
        compSource: "mock",
        verdict: "maybe",
        costBasis: 5,
        netUsd: 10,
        scannedAt: new Date(),
      },
    });
    extra += 1;
  }

  console.log("Seed complete:", {
    tenant: tenant.slug,
    scans: await prisma.scan.count(),
    demoPassword: DEMO_PW,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
