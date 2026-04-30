-- AlterTable
ALTER TABLE "ResumeProject" ADD COLUMN "dateLabel" TEXT;

-- CreateTable
CREATE TABLE "ResumeContactLink" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ResumeContactLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeLayoutSettings" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "pageMode" TEXT,
    "density" TEXT,
    "fontSize" DOUBLE PRECISION,
    "lineHeight" DOUBLE PRECISION,
    "pagePaddingTop" DOUBLE PRECISION,
    "pagePaddingBottom" DOUBLE PRECISION,
    "pagePaddingX" DOUBLE PRECISION,
    "sectionSpacing" INTEGER,
    "itemSpacing" INTEGER,
    "bulletSpacing" INTEGER,
    "showSummary" BOOLEAN NOT NULL DEFAULT true,
    "showExperience" BOOLEAN NOT NULL DEFAULT true,
    "showProjects" BOOLEAN NOT NULL DEFAULT true,
    "showSkills" BOOLEAN NOT NULL DEFAULT true,
    "showEducation" BOOLEAN NOT NULL DEFAULT true,
    "showCertifications" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ResumeLayoutSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeContactLink_resumeId_orderIndex_idx" ON "ResumeContactLink"("resumeId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeLayoutSettings_resumeId_key" ON "ResumeLayoutSettings"("resumeId");

-- AddForeignKey
ALTER TABLE "ResumeContactLink" ADD CONSTRAINT "ResumeContactLink_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "BuildResume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeLayoutSettings" ADD CONSTRAINT "ResumeLayoutSettings_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "BuildResume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
