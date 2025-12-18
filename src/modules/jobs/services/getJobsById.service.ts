import { prisma } from "../../../lib/prisma";
import { ERROR_MESSAGES } from "../../../constants";

export const getJobByIdService = async (jobId: string) => {
  const job = await prisma.jobs.findUnique({
    where: {
      id: jobId,
    },
  });

  if (!job) {
    throw new Error(ERROR_MESSAGES.JOBID_NOT_FOUND.message);
  }

  return job;
};
