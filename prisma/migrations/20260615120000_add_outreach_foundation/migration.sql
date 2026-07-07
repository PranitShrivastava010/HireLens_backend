-- CreateEnum
CREATE TYPE "TargetCompanySource" AS ENUM ('MANUAL', 'JOB_AUTO_DETECTED');

-- CreateEnum
CREATE TYPE "OutreachProvider" AS ENUM ('APOLLO', 'HUNTER', 'LINKEDIN_ASSISTED');

-- CreateEnum
CREATE TYPE "OutreachContactType" AS ENUM ('RECRUITER', 'HIRING_MANAGER', 'ENGINEER', 'OTHER');

-- CreateEnum
CREATE TYPE "OutreachEmailStatus" AS ENUM ('VERIFIED', 'UNVERIFIED', 'MISSING');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('PENDING', 'AI_GENERATED', 'APPROVED', 'SENT', 'SKIPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LinkedInStatus" AS ENUM ('DISCOVERED', 'CONNECTION_NOTE_READY', 'CONNECTION_SENT', 'CONNECTION_ACCEPTED', 'CONNECTION_DECLINED', 'DM_READY', 'DM_SENT', 'SKIPPED');

-- CreateTable
CREATE TABLE "TargetCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "companyWebsite" TEXT,
    "companyLogo" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "careersPageUrl" TEXT,
    "source" "TargetCompanySource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachCompanyJob" (
    "targetCompanyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,

    CONSTRAINT "OutreachCompanyJob_pkey" PRIMARY KEY ("targetCompanyId","jobId")
);

-- CreateTable
CREATE TABLE "OutreachContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCompanyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT NOT NULL,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "contactType" "OutreachContactType" NOT NULL DEFAULT 'OTHER',
    "emailStatus" "OutreachEmailStatus" NOT NULL DEFAULT 'MISSING',
    "outreachStatus" "OutreachStatus" NOT NULL DEFAULT 'PENDING',
    "linkedinStatus" "LinkedInStatus" NOT NULL DEFAULT 'DISCOVERED',
    "provider" "OutreachProvider" NOT NULL,
    "providerContactId" TEXT,
    "providerRaw" JSONB,
    "connectionSentAt" TIMESTAMP(3),
    "connectionAcceptedAt" TIMESTAMP(3),
    "connectionNote" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TargetCompany_userId_name_key" ON "TargetCompany"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TargetCompany_userId_domain_key" ON "TargetCompany"("userId", "domain");

-- CreateIndex
CREATE INDEX "TargetCompany_userId_idx" ON "TargetCompany"("userId");

-- CreateIndex
CREATE INDEX "TargetCompany_domain_idx" ON "TargetCompany"("domain");

-- CreateIndex
CREATE INDEX "OutreachCompanyJob_jobId_idx" ON "OutreachCompanyJob"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachContact_userId_email_key" ON "OutreachContact"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachContact_userId_linkedinUrl_key" ON "OutreachContact"("userId", "linkedinUrl");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachContact_userId_targetCompanyId_name_key" ON "OutreachContact"("userId", "targetCompanyId", "name");

-- CreateIndex
CREATE INDEX "OutreachContact_userId_idx" ON "OutreachContact"("userId");

-- CreateIndex
CREATE INDEX "OutreachContact_targetCompanyId_idx" ON "OutreachContact"("targetCompanyId");

-- CreateIndex
CREATE INDEX "OutreachContact_contactType_idx" ON "OutreachContact"("contactType");

-- CreateIndex
CREATE INDEX "OutreachContact_emailStatus_idx" ON "OutreachContact"("emailStatus");

-- CreateIndex
CREATE INDEX "OutreachContact_linkedinStatus_idx" ON "OutreachContact"("linkedinStatus");

-- AddForeignKey
ALTER TABLE "TargetCompany" ADD CONSTRAINT "TargetCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCompanyJob" ADD CONSTRAINT "OutreachCompanyJob_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "TargetCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCompanyJob" ADD CONSTRAINT "OutreachCompanyJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachContact" ADD CONSTRAINT "OutreachContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachContact" ADD CONSTRAINT "OutreachContact_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "TargetCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
