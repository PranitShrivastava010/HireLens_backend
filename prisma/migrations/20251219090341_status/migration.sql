/*
  Warnings:

  - Added the required column `sortOrder` to the `ApplicationStatus` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApplicationStatus" ADD COLUMN     "allowsDate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL;
