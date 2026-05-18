-- AlterTable
ALTER TABLE "Scan"
ADD COLUMN "fbListingCategory" TEXT,
ADD COLUMN "fbListingDescription" TEXT,
ADD COLUMN "fbListingPostedAt" TIMESTAMP(3),
ADD COLUMN "fbListingPriceCents" INTEGER,
ADD COLUMN "fbListingStatus" TEXT,
ADD COLUMN "fbListingTitle" TEXT;
