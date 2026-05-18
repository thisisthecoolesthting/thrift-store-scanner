-- AlterTable
ALTER TABLE "Device"
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'phone';

-- CreateTable
CREATE TABLE "DevicePairToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceKind" TEXT NOT NULL DEFAULT 'phone',
    "deviceName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePairToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevicePairToken_token_key" ON "DevicePairToken"("token");

-- CreateIndex
CREATE INDEX "DevicePairToken_tenantId_expiresAt_idx" ON "DevicePairToken"("tenantId", "expiresAt");

-- AddForeignKey
ALTER TABLE "DevicePairToken" ADD CONSTRAINT "DevicePairToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
