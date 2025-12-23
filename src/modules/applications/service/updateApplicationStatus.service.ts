import { prisma } from "../../../lib/prisma";

export const updateApplicationStatusService = async ({
  applicationId,
  newStatusKey,
  interviewDate,
}: {
  applicationId: string;
  newStatusKey: string;
  interviewDate?: Date;
}) => {
  const status = await prisma.applicationStatus.findUnique({
    where: { key: newStatusKey },
  });

  if (!status) {
    throw new Error("Invalid status");
  }

  return prisma.jobApplication.update({
    where: { id: applicationId },
    data: {
      statusId: status.id,
      interviewDate: status.allowsDate ? interviewDate ?? new Date() : null,
    },
  });
};
