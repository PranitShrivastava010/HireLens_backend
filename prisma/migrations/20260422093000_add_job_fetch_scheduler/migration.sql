-- CreateEnum
CREATE TYPE "FetchCategory" AS ENUM ('ENGINEERING', 'PRODUCT', 'HR', 'DATA', 'DESIGN', 'SALES', 'MARKETING', 'OPERATIONS', 'FINANCE');

-- CreateEnum
CREATE TYPE "JobEnrichmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobPipelineStage" AS ENUM ('FETCH', 'ENRICH');

-- CreateEnum
CREATE TYPE "FetchRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FetchTriggerType" AS ENUM ('CRON', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobFetchRunItemType" AS ENUM ('TARGET', 'JOB');

-- AlterTable
ALTER TABLE "Jobs"
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "enrichmentAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enrichmentLastError" TEXT,
ADD COLUMN     "enrichmentQueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "enrichmentStartedAt" TIMESTAMP(3),
ADD COLUMN     "enrichmentStatus" "JobEnrichmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "JobFetchTarget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "category" "FetchCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "demandScore" INTEGER NOT NULL DEFAULT 0,
    "refreshEveryMinutes" INTEGER NOT NULL DEFAULT 360,
    "lastFetchedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobFetchTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFetchTargetRole" (
    "targetId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "JobFetchTargetRole_pkey" PRIMARY KEY ("targetId","roleId")
);

-- CreateTable
CREATE TABLE "JobFetchRun" (
    "id" TEXT NOT NULL,
    "stage" "JobPipelineStage" NOT NULL DEFAULT 'FETCH',
    "status" "FetchRunStatus" NOT NULL DEFAULT 'RUNNING',
    "triggerType" "FetchTriggerType" NOT NULL DEFAULT 'CRON',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "itemsPlanned" INTEGER NOT NULL DEFAULT 0,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "jobsFetched" INTEGER NOT NULL DEFAULT 0,
    "jobsCreated" INTEGER NOT NULL DEFAULT 0,
    "jobsUpdated" INTEGER NOT NULL DEFAULT 0,
    "jobsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFetchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobFetchRunItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "targetId" TEXT,
    "itemType" "JobFetchRunItemType" NOT NULL DEFAULT 'TARGET',
    "label" TEXT NOT NULL,
    "query" TEXT,
    "status" "FetchRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "jobsFetched" INTEGER NOT NULL DEFAULT 0,
    "jobsCreated" INTEGER NOT NULL DEFAULT 0,
    "jobsUpdated" INTEGER NOT NULL DEFAULT 0,
    "jobsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "JobFetchRunItem_pkey" PRIMARY KEY ("id")
);

-- Seed enrichment status for existing jobs
UPDATE "Jobs" j
SET
  "enrichmentStatus" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "JobRole" jr
      WHERE jr."jobId" = j."id"
    ) AND EXISTS (
      SELECT 1
      FROM "JobSkill" js
      WHERE js."jobId" = j."id"
    ) THEN 'COMPLETED'::"JobEnrichmentStatus"
    ELSE 'PENDING'::"JobEnrichmentStatus"
  END,
  "enrichedAt" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "JobRole" jr
      WHERE jr."jobId" = j."id"
    ) AND EXISTS (
      SELECT 1
      FROM "JobSkill" js
      WHERE js."jobId" = j."id"
    ) THEN COALESCE(j."lastFetchedAt", j."createdAt", CURRENT_TIMESTAMP)
    ELSE NULL
  END,
  "enrichmentQueuedAt" = COALESCE(j."lastFetchedAt", j."createdAt", CURRENT_TIMESTAMP);

-- CreateIndex
CREATE UNIQUE INDEX "JobFetchTarget_name_key" ON "JobFetchTarget"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JobFetchTarget_query_key" ON "JobFetchTarget"("query");

-- CreateIndex
CREATE INDEX "Jobs_enrichmentStatus_enrichmentQueuedAt_idx" ON "Jobs"("enrichmentStatus", "enrichmentQueuedAt");

-- CreateIndex
CREATE INDEX "JobFetchTarget_isActive_nextRunAt_idx" ON "JobFetchTarget"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "JobFetchTarget_priority_demandScore_idx" ON "JobFetchTarget"("priority", "demandScore");

-- CreateIndex
CREATE INDEX "JobFetchRun_stage_startedAt_idx" ON "JobFetchRun"("stage", "startedAt");

-- CreateIndex
CREATE INDEX "JobFetchRunItem_runId_idx" ON "JobFetchRunItem"("runId");

-- CreateIndex
CREATE INDEX "JobFetchRunItem_targetId_idx" ON "JobFetchRunItem"("targetId");

-- AddForeignKey
ALTER TABLE "JobFetchTargetRole" ADD CONSTRAINT "JobFetchTargetRole_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "JobFetchTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFetchTargetRole" ADD CONSTRAINT "JobFetchTargetRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFetchRunItem" ADD CONSTRAINT "JobFetchRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "JobFetchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFetchRunItem" ADD CONSTRAINT "JobFetchRunItem_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "JobFetchTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
