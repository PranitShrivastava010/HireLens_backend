/*
  Warnings:

  - Made the column `extractedText` on table `Resume` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Resume" ALTER COLUMN "extractedText" SET NOT NULL;
