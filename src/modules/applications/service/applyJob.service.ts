import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

interface ApplyJobInput {
    userId: string;
    jobId: string;
    statusKey: string;
    interviewDate?: Date;
}

export const applyJobService = async ({
  userId,
  jobId,
  statusKey,
  interviewDate
}: ApplyJobInput) => {

  const status = await prisma.applicationStatus.findUnique({
    where: { key: statusKey },
  });

  if (!status) {
    throw new Error("Invalid application status");
  }

  if (status.allowsDate && !interviewDate) {
    throw new Error("Interview date is required for this status");
  }

  const application = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1️⃣ Upsert application
    const app = await tx.jobApplication.upsert({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      update: {
        statusId: status.id,
        interviewDate: interviewDate ?? null,
      },
      create: {
        userId,
        jobId,
        statusId: status.id,
        interviewDate: interviewDate ?? null,
      },
    });

    // 2️⃣ Mark job as applied
    await tx.jobs.update({
      where: { id: jobId },
      data: { applyStatus: true },
    });

    return app;
  });

  return application;
};
