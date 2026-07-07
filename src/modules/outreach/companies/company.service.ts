import { prisma } from "../../../lib/prisma";
import { TargetCompanyInput } from "../outreach.schema";
import { outreachDb } from "../outreach.prisma";
import { TargetCompanySource } from "../outreach.types";

type AddCompanyInput = string | TargetCompanyInput;

const cleanNullableString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed || null;
};

export const normalizeDomain = (value?: string | null) => {
  const cleaned = cleanNullableString(value);

  if (!cleaned) {
    return null;
  }

  try {
    const withProtocol = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return cleaned
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim()
      .toLowerCase();
  }
};

const normalizeCompanyInput = (company: AddCompanyInput) => {
  if (typeof company === "string") {
    return {
      name: company.trim(),
      domain: null,
      companyWebsite: null,
      companyLogo: null,
      industry: null,
      size: null,
      careersPageUrl: null,
    };
  }

  const companyWebsite = cleanNullableString(company.companyWebsite);

  return {
    name: company.name.trim(),
    domain: normalizeDomain(company.domain ?? companyWebsite),
    companyWebsite,
    companyLogo: cleanNullableString(company.companyLogo),
    industry: cleanNullableString(company.industry),
    size: cleanNullableString(company.size),
    careersPageUrl: cleanNullableString(company.careersPageUrl),
  };
};

const findExistingCompany = async (userId: string, name: string, domain?: string | null) => {
  return outreachDb.targetCompany.findFirst({
    where: {
      userId,
      OR: [
        { name },
        ...(domain ? [{ domain }] : []),
      ],
    },
  });
};

export const addTargetCompaniesService = async (
  userId: string,
  companies: AddCompanyInput[],
  source: TargetCompanySource = TargetCompanySource.MANUAL
) => {
  const savedCompanies = [];

  for (const companyInput of companies) {
    const company = normalizeCompanyInput(companyInput);
    const existing = await findExistingCompany(userId, company.name, company.domain);

    if (existing) {
      savedCompanies.push(
        await outreachDb.targetCompany.update({
          where: { id: existing.id },
          data: {
            domain: existing.domain ?? company.domain,
            companyWebsite: existing.companyWebsite ?? company.companyWebsite,
            companyLogo: existing.companyLogo ?? company.companyLogo,
            industry: existing.industry ?? company.industry,
            size: existing.size ?? company.size,
            careersPageUrl: existing.careersPageUrl ?? company.careersPageUrl,
          },
        })
      );
      continue;
    }

    savedCompanies.push(
      await outreachDb.targetCompany.create({
        data: {
          userId,
          ...company,
          source,
        },
      })
    );
  }

  return savedCompanies;
};

export const getTargetCompaniesService = async (userId: string) => {
  return outreachDb.targetCompany.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          contacts: true,
          jobs: true,
        },
      },
    },
  });
};

export const deleteTargetCompanyService = async (userId: string, companyId: string) => {
  const company = await outreachDb.targetCompany.findFirst({
    where: {
      id: companyId,
      userId,
    },
  });

  if (!company) {
    throw new Error("Target company not found");
  }

  await outreachDb.targetCompany.delete({
    where: { id: companyId },
  });
};

export const autoDetectTargetCompaniesService = async (userId: string, limit = 50) => {
  const jobs = await prisma.jobs.findMany({
    where: {
      jobRoles: {
        some: {
          role: {
            rolePreferences: {
              some: { userId },
            },
          },
        },
      },
    },
    orderBy: [
      { postedAtUtc: "desc" },
      { lastFetchedAt: "desc" },
    ],
    take: limit * 3,
    select: {
      id: true,
      companyName: true,
      companyWebsite: true,
      companyLogo: true,
    },
  });

  const groupedCompanies = new Map<string, {
    name: string;
    domain: string | null;
    companyWebsite: string | null;
    companyLogo: string | null;
    jobIds: string[];
  }>();

  for (const job of jobs) {
    const key = job.companyName.trim().toLowerCase();

    if (!key) {
      continue;
    }

    const existing = groupedCompanies.get(key);

    if (existing) {
      existing.jobIds.push(job.id);
      continue;
    }

    groupedCompanies.set(key, {
      name: job.companyName.trim(),
      domain: normalizeDomain(job.companyWebsite),
      companyWebsite: job.companyWebsite,
      companyLogo: job.companyLogo,
      jobIds: [job.id],
    });

    if (groupedCompanies.size >= limit) {
      break;
    }
  }

  const createdOrUpdated = [];

  for (const company of groupedCompanies.values()) {
    const [savedCompany] = await addTargetCompaniesService(
      userId,
      [{
        name: company.name,
        domain: company.domain,
        companyWebsite: company.companyWebsite,
        companyLogo: company.companyLogo,
      }],
      TargetCompanySource.JOB_AUTO_DETECTED
    );

    await outreachDb.outreachCompanyJob.createMany({
      data: company.jobIds.map((jobId) => ({
        targetCompanyId: savedCompany.id,
        jobId,
      })),
      skipDuplicates: true,
    });

    createdOrUpdated.push(savedCompany);
  }

  return createdOrUpdated;
};
