import { PrismaClient } from "@prisma/client";
import { generateFbListing, type IdentifyResponse } from "../src/lib/fb-listing";

async function main() {
  const scanId = process.argv[2];
  if (!scanId) {
    console.error("Usage: npx tsx scripts/fb-listing-from-scan.ts <scanId>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { tenant: true },
    });
    if (!scan) {
      console.error(`Scan not found: ${scanId}`);
      process.exit(1);
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

    const draft = generateFbListing(scan, identifySeed, scan.tenant);
    process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
