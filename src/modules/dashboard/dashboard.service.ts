import { prisma } from "../../lib/prisma";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from "date-fns";

export const getDashboardStatsService = async (userId: string) => {
  const [user, statuses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyGoal: true },
    }),
    prisma.applicationStatus.findMany({
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
  const interviewStatusId = statuses.find(
    (status) => status.key === "INTERVIEW"
  )?.id;

  const [
    applicationsThisWeek,
    counts,
    upcomingInterviews,
    recentApplications,
  ] = await Promise.all([
    prisma.jobApplication.findMany({
      where: {
        userId,
        appliedAt: {
          gte: startOfCurrentWeek,
          lte: endOfCurrentWeek,
        },
        status: {
          key: "APPLIED",
        },
      },
      select: {
        appliedAt: true,
        status: {
          select: {
            key: true,
          },
        },
      },
    }),
    prisma.jobApplication.groupBy({
      by: ["statusId"],
      where: { userId },
      _count: {
        _all: true,
      },
    }),
    interviewStatusId
      ? prisma.jobApplication.findMany({
          where: {
            userId,
            statusId: interviewStatusId,
            interviewDate: { gte: now },
          },
          select: {
            interviewDate: true,
            job: {
              select: {
                title: true,
                companyName: true,
              },
            },
          },
          orderBy: { interviewDate: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.jobApplication.findMany({
      where: { userId },
      select: {
        appliedAt: true,
        job: {
          select: {
            title: true,
            companyName: true,
          },
        },
        status: {
          select: {
            label: true,
          },
        },
      },
      orderBy: { appliedAt: "desc" },
      take: 5,
    }),
  ]);

  const appliedThisWeekCount = applicationsThisWeek.length;
  const weeklyGoal = user.weeklyGoal || 10;
  const percentage = Math.min(
    Math.round((appliedThisWeekCount / weeklyGoal) * 100),
    100
  );

  const statusSummary = statuses.map((status) => {
    const statusCount = counts.find((count) => count.statusId === status.id);

    return {
      key: status.key,
      label: status.label,
      count: statusCount?._count._all || 0,
    };
  });

  const days = eachDayOfInterval({
    start: startOfCurrentWeek,
    end: endOfCurrentWeek,
  });

  const weeklyActivity: Record<string, number> = {};

  for (const day of days) {
    const dayName = format(day, "eeee").toLowerCase();
    const count = applicationsThisWeek.filter((application) =>
      isSameDay(new Date(application.appliedAt), day)
    ).length;

    weeklyActivity[dayName] = count;
  }

  return {
    weeklyProgress: {
      appliedThisWeek: appliedThisWeekCount,
      weeklyGoal,
      percentage,
    },
    statusSummary,
    weeklyActivity,
    upcomingInterviews: upcomingInterviews.map((interview) => ({
      jobTitle: interview.job.title,
      companyName: interview.job.companyName,
      interviewDate: interview.interviewDate,
    })),
    recentApplications: recentApplications.map((application) => ({
      jobTitle: application.job.title,
      companyName: application.job.companyName,
      status: application.status.label,
      appliedAt: application.appliedAt,
    })),
  };
};

export const updateWeeklyGoalService = async (userId: string, goal: number) => {
  return prisma.user.update({
    where: { id: userId },
    data: { weeklyGoal: goal },
    select: { weeklyGoal: true },
  });
};
