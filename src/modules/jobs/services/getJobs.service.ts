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

type JobWithRelations = Pick<
  Jobs,
  | "id"
  | "title"
  | "description"
  | "companyName"
  | "companyLogo"
  | "location"
  | "city"
  | "state"
  | "employmentType"
  | "isRemote"
  | "postedAtUtc"
  | "minExperienceYears"
  | "maxExperienceYears"
  | "minSalary"
  | "maxSalary"
  | "applyStatus"
> & {
  jobSkills: Array<Pick<JobSkill, "skillId">>;
  jobRoles: Array<Pick<JobRole, "roleId">>;
  applications: {
    status: {
      key: string;
      label: string;
    };
  }[];
};

const CACHE_TTL_SECONDS = 600;
const CACHE_TIMEOUT_MS = Number(process.env.REDIS_TIMEOUT_MS ?? 200);
const MIN_CANDIDATE_POOL = 100;
const MAX_CANDIDATE_POOL = 300;
const CANDIDATE_POOL_MULTIPLIER = 5;

const resolveWithin = async <T>(
  operation: Promise<T>,
  fallback: T,
  timeoutMs: number
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
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
  const freshnessCutoff = subDays(new Date(), 30);
  const candidatePoolSize = Math.min(
    MAX_CANDIDATE_POOL,
    Math.max(MIN_CANDIDATE_POOL, page * limit * CANDIDATE_POOL_MULTIPLIER)
  );

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

  const skillIds = userSkills.map((skill) => skill.skillId);
  const roleIds = userRoles.map((role) => role.roleId);

  const [skillAliases, roleAliases] = await Promise.all([
    skillIds.length
      ? prisma.skillAlias.findMany({
          where: { skillId: { in: skillIds } },
          select: { alias: true },
        })
      : Promise.resolve([]),
    roleIds.length
      ? prisma.roleAlias.findMany({
          where: { roleId: { in: roleIds } },
          select: { alias: true },
        })
      : Promise.resolve([]),
  ]);

  const skillAliasSet = new Set(
    skillAliases.map((aliasRecord) => aliasRecord.alias.toLowerCase())
  );
  const roleAliasSet = new Set(
    roleAliases.map((aliasRecord) => aliasRecord.alias.toLowerCase())
  );

  const prefHash = [skillIds.sort().join(","), roleIds.sort().join(",")].join("|");
  const cachedKey = `job:feed:${userId}:${prefHash}:page:${page}:limit:${limit}:search:${search ?? "all"}:location:${location ?? "all"}:remote:${isRemote ?? "all"}`;

  try {
    const cached = await resolveWithin(
      redis.get(cachedKey),
      null,
      CACHE_TIMEOUT_MS
    );

    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn("Redis error on get:", error);
  }

  const filters: any[] = [
    {
      OR: [
        { postedAtUtc: { gte: freshnessCutoff } },
        {
          postedAtUtc: null,
          lastFetchedAt: { gte: freshnessCutoff },
        },
      ],
    },
  ];

  if (search) {
    filters.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (location) {
    filters.push({
      location: { contains: location, mode: "insensitive" },
    });
  }

  if (isRemote !== undefined) {
    filters.push({
      isRemote,
    });
  }

  const where: any = filters.length === 1 ? filters[0] : { AND: filters };

  const candidateJobs = (await prisma.jobs.findMany({
    where,
    take: candidatePoolSize,
    orderBy: [{ postedAtUtc: "desc" }, { lastFetchedAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      companyName: true,
      companyLogo: true,
      location: true,
      city: true,
      state: true,
      employmentType: true,
      isRemote: true,
      postedAtUtc: true,
      minExperienceYears: true,
      maxExperienceYears: true,
      minSalary: true,
      maxSalary: true,
      applyStatus: true,
      jobSkills: {
        select: {
          skillId: true,
        },
      },
      jobRoles: {
        select: {
          roleId: true,
        },
      },
      applications: {
        where: { userId },
        take: 1,
        select: {
          status: {
            select: {
              key: true,
              label: true,
            },
          },
        },
      },
    },
  })) as JobWithRelations[];

  const skillIdSet = new Set(skillIds);
  const roleIdSet = new Set(roleIds);

  const scoredJobs = candidateJobs.map((job) => {
    let score = 0;
    const title = job.title.toLowerCase();
    const description = job.description.toLowerCase();

    for (const jobSkill of job.jobSkills) {
      if (skillIdSet.has(jobSkill.skillId)) {
        score += 10;
      }
    }

    for (const jobRole of job.jobRoles) {
      if (roleIdSet.has(jobRole.roleId)) {
        score += 8;
      }
    }

    for (const alias of skillAliasSet) {
      if (title.includes(alias)) {
        score += 5;
      }

      if (description.includes(alias)) {
        score += 3;
      }
    }

    for (const alias of roleAliasSet) {
      if (title.includes(alias)) {
        score += 4;
      }
    }

    if (job.postedAtUtc) {
      const age = differenceInDays(new Date(), job.postedAtUtc);

      if (age <= 3) {
        score += 2;
      }
    }

    return { ...job, relevanceScore: score };
  });

  scoredJobs.sort((left, right) => right.relevanceScore - left.relevanceScore);

  const paginated = scoredJobs.slice(skip, skip + limit);

  const response = {
    jobs: paginated.map((job) => {
      const applicationStatus =
        job.applications.length > 0 ? job.applications[0].status : null;

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

      if (applicationStatus) {
        jobData.applicationStatus = {
          key: applicationStatus.key,
          label: applicationStatus.label,
        };
      }

      return jobData;
    }),
    meta: {
      total: scoredJobs.length,
      page,
      limit,
      totalPages: Math.ceil(scoredJobs.length / limit),
    },
  };

  try {
    await resolveWithin(
      redis.set(cachedKey, response, { ex: CACHE_TTL_SECONDS }),
      null,
      CACHE_TIMEOUT_MS
    );
  } catch (error) {
    console.warn("Redis error on set:", error);
  }

  return response;
};
