import { prisma } from "../../../lib/prisma";

export const getUserJobApplicationsService = async (userId: string) => {
  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    select: {
      id: true,
      appliedAt: true,
      interviewDate: true,
      status: {
        select: {
          key: true,
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          companyName: true,
          companyLogo: true,
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  const board: Record<string, any[]> = {};

  for (const application of applications) {
    const key = application.status.key;

    if (!board[key]) {
      board[key] = [];
    }

    board[key].push({
      applicationId: application.id,
      jobId: application.job.id,
      jobTitle: application.job.title,
      companyName: application.job.companyName,
      companyLogo: application.job.companyLogo,
      appliedAt: application.appliedAt,
      interviewDate: application.interviewDate,
    });
  }

  return board;
};
