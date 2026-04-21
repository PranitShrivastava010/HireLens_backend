// src/modules/jobs/jobs.service.ts
import { prisma } from "../../../lib/prisma";
import { subDays, differenceInDays } from "date-fns";
import { Jobs, JobSkill, JobRole } from "@prisma/client";
import { redis } from "../../../config/redis";

interface GetJobsParams {
  userId: string;
  search?: string;
  location?: string;
  isRemote?: boolean;
  page?: number;
  limit?: number;
}

type JobWithRelations = Jobs & {
  jobSkills: JobSkill[];
  jobRoles: JobRole[];
  applications: {
    status: {
      key: string;
      label: string;
    };
  }[];
};

export const getJobsService = async ({
  userId,
  search,
  location,
  isRemote,
  page = 1,
  limit = 10,
}: GetJobsParams) => {
  const skip = (page - 1) * limit;

  /* 1️⃣ User preferences */
  const [userSkills, userRoles] = await Promise.all([
    prisma.userSkillPreference.findMany({
      where: { userId },
      select: { skillId: true },
    }),
    prisma.userRolePreference.findMany({
      where: { userId },
      select: { roleId: true },
    }),
  ]);

  const skillIds = userSkills.map((s: { skillId: string }) => s.skillId);
  const roleIds = userRoles.map((r: { roleId: string }) => r.roleId);

  /* 2️⃣ Aliases */
  const [skillAliases, roleAliases] = await Promise.all([
    prisma.skillAlias.findMany({
      where: { skillId: { in: skillIds } },
      select: { alias: true },
    }),
    prisma.roleAlias.findMany({
      where: { roleId: { in: roleIds } },
      select: { alias: true },
    }),
  ]);

  const skillAliasSet = new Set<string>(
    skillAliases.map((a: { alias: string }) => a.alias.toLowerCase())
  );

  const roleAliasSet = new Set<string>(
    roleAliases.map((a: { alias: string }) => a.alias.toLowerCase())
  );

  const prefHash = [
    skillIds.sort().join(","),
    roleIds.sort().join(","),
  ].join("|");

  const cachedKey = `job:feed:${userId}:${prefHash}:page:${page}:limit:${limit}:search:${search ?? "all"}:location:${location ?? "all"}:remote:${isRemote ?? "all"}`;

  try {
    const cached = await redis.get(cachedKey);
    if (cached) return cached;
  } catch (error) {
    console.warn("Redis error on get:", error);
  }

  /* 3️⃣ Hard filters */
  const where: any = {
    lastFetchedAt: { gte: subDays(new Date(), 30) },
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }

  if (isRemote !== undefined) {
    where.isRemote = isRemote;
  }

  /* 4️⃣ Candidate pool */
  const candidateJobs = (await prisma.jobs.findMany({
    where,
    take: 300,
    orderBy: [{ postedAtUtc: "desc" }, { lastFetchedAt: "desc" }],
    include: { jobSkills: true, jobRoles: true, applications: { include: { status: {select: {key: true, label: true}} } } },
  })) as JobWithRelations[];

  const skillIdSet = new Set(skillIds);
  const roleIdSet = new Set(roleIds);

  /* 5️⃣ Scoring */
  const scoredJobs = candidateJobs.map((job: JobWithRelations) => {
    let score = 0;
    const title = job.title.toLowerCase();
    const description = job.description?.toLowerCase() ?? "";

    for (const js of job.jobSkills) {
      if (skillIdSet.has(js.skillId)) score += 10;
    }

    for (const jr of job.jobRoles) {
      if (roleIdSet.has(jr.roleId)) score += 8;
    }

    for (const alias of skillAliasSet) {
      if (title.includes(alias)) score += 5;
      if (description.includes(alias)) score += 3;
    }

    for (const alias of roleAliasSet) {
      if (title.includes(alias)) score += 4;
    }

    if (job.postedAtUtc) {
      const age = differenceInDays(new Date(), job.postedAtUtc);
      if (age <= 3) score += 2;
    }

    return { ...job, relevanceScore: score };
  });

  /* 6️⃣ Sort + paginate */
  scoredJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const paginated = scoredJobs.slice(skip, skip + limit);


  /* 7️⃣ Response */
  const response = {
    jobs: paginated.map(
      (job: JobWithRelations & { relevanceScore: number }) => {
        // Get application status if it exists
        const applicationStatus = job.applications.length > 0 ? job.applications[0].status : null;
        
        const jobData: any = {
          id: job.id,
          title: job.title,
          companyName: job.companyName,
          companyLogo: job.companyLogo,
          location: job.location,
          city: job.city,
          state: job.state,
          employmentType: job.employmentType,
          isRemote: job.isRemote,
          postedAtUtc: job.postedAtUtc,
          minExperienceYears: job.minExperienceYears,
          maxExperienceYears: job.maxExperienceYears,
          minSalary: job.minSalary,
          maxSalary: job.maxSalary,
          applyStatus: job.applyStatus,
        };

        // Add application status label if application exists
        if (applicationStatus) {
          jobData.applicationStatus = {
            key: applicationStatus.key,
            label: applicationStatus.label,
          };
        }

        return jobData;
      }
    ),
    meta: {
      total: scoredJobs.length,
      page,
      limit,
      totalPages: Math.ceil(scoredJobs.length / limit),
    },
  };

  try {
    await redis.set(cachedKey, response, { ex: 600 });
  } catch (error) {
    console.warn("Redis error on set:", error);
  }

  return response
};
