/*
  Warnings:

  - Added the required column `updatedAt` to the `JobApplication` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "JobApplication_jobId_idx";

-- DropIndex
DROP INDEX "JobApplication_userId_idx";

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
