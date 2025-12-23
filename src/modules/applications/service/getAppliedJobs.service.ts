import { prisma } from "../../../lib/prisma";

export const getUserJobApplicationsService = async (userId: string) => {
  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    include: {
      status: true,
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

  // Group by status.key
  const board: Record<string, any[]> = {};

  for (const app of applications) {
    const key = app.status.key;

    if (!board[key]) board[key] = [];

    board[key].push({
      applicationId: app.id,
      jobId: app.job.id,
      jobTitle: app.job.title,
      companyName: app.job.companyName,
      companyLogo: app.job.companyLogo,
      appliedAt: app.appliedAt,
      interviewDate: app.interviewDate,
    });
  }

  return board;
};
