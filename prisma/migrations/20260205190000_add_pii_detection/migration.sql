-- CreateTable
CREATE TABLE "PiiDetection" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "piiType" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "placeholder" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "PiiDetection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PiiDetection_messageId_idx" ON "PiiDetection"("messageId");

-- CreateIndex
CREATE INDEX "PiiDetection_messageId_piiType_idx" ON "PiiDetection"("messageId", "piiType");

-- CreateIndex
CREATE INDEX "PiiDetection_detectedAt_idx" ON "PiiDetection"("detectedAt");

-- CreateIndex
CREATE INDEX "PiiDetection_piiType_idx" ON "PiiDetection"("piiType");

-- AddForeignKey
ALTER TABLE "PiiDetection" ADD CONSTRAINT "PiiDetection_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
