-- CreateEnum
CREATE TYPE "KeywordType" AS ENUM ('ATOMIC', 'CATEGORY', 'CONCEPT');

-- AlterTable
ALTER TABLE "JobKeyword" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "type" "KeywordType" NOT NULL DEFAULT 'ATOMIC';
