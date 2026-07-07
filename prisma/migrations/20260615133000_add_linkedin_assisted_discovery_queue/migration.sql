-- CreateEnum
CREATE TYPE "OutreachDiscoveryQueueStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutreachDiscoveryTaskStatus" AS ENUM ('PENDING', 'OPENED', 'CAPTURED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "OutreachDiscoveryQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "status" "OutreachDiscoveryQueueStatus" NOT NULL DEFAULT 'PENDING',
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OutreachDiscoveryQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachDiscoveryTask" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCompanyId" TEXT NOT NULL,
    "contactType" "OutreachContactType" NOT NULL,
    "searchTitle" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "searchUrl" TEXT NOT NULL,
    "status" "OutreachDiscoveryTaskStatus" NOT NULL DEFAULT 'PENDING',
    "orderIndex" INTEGER NOT NULL,
    "capturedCount" INTEGER NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachDiscoveryTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachDiscoveryQueue_userId_createdAt_idx" ON "OutreachDiscoveryQueue"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachDiscoveryQueue_status_idx" ON "OutreachDiscoveryQueue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachDiscoveryTask_queueId_orderIndex_key" ON "OutreachDiscoveryTask"("queueId", "orderIndex");

-- CreateIndex
CREATE INDEX "OutreachDiscoveryTask_queueId_status_orderIndex_idx" ON "OutreachDiscoveryTask"("queueId", "status", "orderIndex");

-- CreateIndex
CREATE INDEX "OutreachDiscoveryTask_userId_status_idx" ON "OutreachDiscoveryTask"("userId", "status");

-- CreateIndex
CREATE INDEX "OutreachDiscoveryTask_targetCompanyId_idx" ON "OutreachDiscoveryTask"("targetCompanyId");

-- AddForeignKey
ALTER TABLE "OutreachDiscoveryQueue" ADD CONSTRAINT "OutreachDiscoveryQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachDiscoveryTask" ADD CONSTRAINT "OutreachDiscoveryTask_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "OutreachDiscoveryQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachDiscoveryTask" ADD CONSTRAINT "OutreachDiscoveryTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachDiscoveryTask" ADD CONSTRAINT "OutreachDiscoveryTask_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "TargetCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
