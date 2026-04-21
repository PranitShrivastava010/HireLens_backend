import { prisma } from "../../lib/prisma";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from "date-fns";

export const getDashboardStatsService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyGoal: true }
  });

  if (!user) throw new Error("User not found");

  const now = new Date();
  // date-fns startOfWeek default is Sunday (0). We want Monday (1).
  const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });

  // 1. Weekly Progress
  const applicationsThisWeek = await prisma.jobApplication.findMany({
    where: {
      userId,
      appliedAt: {
        gte: startOfCurrentWeek,
        lte: endOfCurrentWeek,
      },
    },
  });

  const appliedThisWeekCount = applicationsThisWeek.length;
  const weeklyGoal = user.weeklyGoal || 10;
  const percentage = Math.min(Math.round((appliedThisWeekCount / weeklyGoal) * 100), 100);

  // 2. Status Summary
  const statuses = await prisma.applicationStatus.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  const counts = await prisma.jobApplication.groupBy({
    by: ['statusId'],
    where: { userId },
    _count: {
      _all: true
    }
  });

  const statusSummary = statuses.map((s: any) => {
    const statusCount = counts.find((c: any) => c.statusId === s.id);
    return {
      key: s.key,
      label: s.label,
      count: statusCount?._count._all || 0
    };
  });

  // 3. Weekly Activity (Monday to Sunday)
  const days = eachDayOfInterval({
    start: startOfCurrentWeek,
    end: endOfCurrentWeek,
  });

  const weeklyActivity: Record<string, number> = {};
  days.forEach(day => {
    const dayName = format(day, "eeee").toLowerCase();
    const count = applicationsThisWeek.filter((app: any) => isSameDay(new Date(app.appliedAt), day)).length;
    weeklyActivity[dayName] = count;
  });

  // 4. Upcoming Interviews
  const upcomingInterviews = await prisma.jobApplication.findMany({
    where: {
      userId,
      status: { key: "INTERVIEW" },
      interviewDate: { gte: now }
    },
    include: {
      job: {
        select: {
          title: true,
          companyName: true
        }
      }
    },
    orderBy: { interviewDate: 'asc' },
    take: 5
  });

  // 5. Recent Applications
  const recentApplications = await prisma.jobApplication.findMany({
    where: { userId },
    include: {
      job: {
        select: {
          title: true,
          companyName: true
        }
      },
      status: {
        select: {
          label: true
        }
      }
    },
    orderBy: { appliedAt: 'desc' },
    take: 5
  });

  return {
    weeklyProgress: {
      appliedThisWeek: appliedThisWeekCount,
      weeklyGoal,
      percentage
    },
    statusSummary,
    weeklyActivity,
    upcomingInterviews: upcomingInterviews.map((i: any) => ({
      jobTitle: i.job.title,
      companyName: i.job.companyName,
      interviewDate: i.interviewDate
    })),
    recentApplications: recentApplications.map((a: any) => ({
      jobTitle: a.job.title,
      companyName: a.job.companyName,
      status: a.status.label,
      appliedAt: a.appliedAt
    }))
  };
};

export const updateWeeklyGoalService = async (userId: string, goal: number) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { weeklyGoal: goal },
    select: { weeklyGoal: true }
  });
};
