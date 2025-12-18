// src/modules/jobs/jobs.service.ts
import { prisma } from "../../../lib/prisma";

interface GetJobsParams {
  search?: string;
  location?: string;
  isRemote?: boolean;
  page?: number;
  limit?: number;
}

export const getJobsService = async ({
  search,
  location,
  isRemote,
  page = 1,
  limit = 10,
}: GetJobsParams) => {
  const skip = (page - 1) * limit;

  const where: any = { AND: [] };

  if (search) {
    where.AND.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (location) {
    where.AND.push({
      location: { contains: location, mode: "insensitive" },
    });
  }

  if (isRemote !== undefined) {
    where.AND.push({ isRemote });
  }

  const [jobs, total] = await Promise.all([
    prisma.jobs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { postedAtUtc: "desc" },
      select: {
        id: true,
        title: true,
        location: true,
        city: true,
        state: true,
        companyName: true,
        companyLogo: true,
        employmentType: true,
        postedAt: true,
        minExperienceYears: true,
        maxExperienceYears: true,
        minSalary: true,
        maxSalary: true
      },
    }),
    prisma.jobs.count({ where }),
  ]);

  return {
    jobs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
