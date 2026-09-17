-- CreateTable
CREATE TABLE "CaptureComment" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureEvidence" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaptureComment_tenantId_captureId_createdAt_idx" ON "CaptureComment"("tenantId", "captureId", "createdAt");

-- CreateIndex
CREATE INDEX "CaptureEvidence_tenantId_captureId_createdAt_idx" ON "CaptureEvidence"("tenantId", "captureId", "createdAt");

-- AddForeignKey
ALTER TABLE "CaptureComment" ADD CONSTRAINT "CaptureComment_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureComment" ADD CONSTRAINT "CaptureComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureComment" ADD CONSTRAINT "CaptureComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureEvidence" ADD CONSTRAINT "CaptureEvidence_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureEvidence" ADD CONSTRAINT "CaptureEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureEvidence" ADD CONSTRAINT "CaptureEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
