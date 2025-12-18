/*
  Warnings:

  - The `salaryPeriod` column on the `Jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "Jobs" ADD COLUMN     "experienceRaw" TEXT[],
ADD COLUMN     "maxExperienceYears" INTEGER,
ADD COLUMN     "minExperienceYears" INTEGER,
DROP COLUMN "salaryPeriod",
ADD COLUMN     "salaryPeriod" "SalaryPeriod";

-- CreateIndex
CREATE INDEX "Jobs_isRemote_idx" ON "Jobs"("isRemote");

-- CreateIndex
CREATE INDEX "Jobs_postedAtUtc_idx" ON "Jobs"("postedAtUtc");

-- CreateIndex
CREATE INDEX "Jobs_minSalary_idx" ON "Jobs"("minSalary");

-- CreateIndex
CREATE INDEX "Jobs_maxSalary_idx" ON "Jobs"("maxSalary");

-- CreateIndex
CREATE INDEX "Jobs_minExperienceYears_idx" ON "Jobs"("minExperienceYears");

-- CreateIndex
CREATE INDEX "Jobs_maxExperienceYears_idx" ON "Jobs"("maxExperienceYears");
