import { prisma } from "../../../lib/prisma";
import { ERROR_MESSAGES } from "../../../constants";

export const getJobByIdService = async (jobId: string, userId: string) => {
  const job = await prisma.jobs.findUnique({
    where: {
      id: jobId,
    },
    include: {
      applications: {
        where: {
          userId: userId,
        },
        include: {
          status: {
            select: {
              key: true,
              label: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new Error(ERROR_MESSAGES.JOBID_NOT_FOUND.message);
  }

  // Get application status if it exists for this user
  const applicationStatus = job.applications.length > 0 ? job.applications[0].status : null;

  return {
    ...job,
    applyStatus: job.applyStatus,
    applicationStatus: applicationStatus,
  };
};
