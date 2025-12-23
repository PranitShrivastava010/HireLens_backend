-- CreateTable
CREATE TABLE "JobKeyword" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobKeyword_jobId_idx" ON "JobKeyword"("jobId");

-- CreateIndex
CREATE INDEX "JobKeyword_keyword_idx" ON "JobKeyword"("keyword");

-- AddForeignKey
ALTER TABLE "JobKeyword" ADD CONSTRAINT "JobKeyword_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
