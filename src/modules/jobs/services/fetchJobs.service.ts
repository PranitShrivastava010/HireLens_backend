import { JobEnrichmentStatus } from "@prisma/client";
import axios from "axios";
import { prisma } from "../../../lib/prisma";
import { extractExperience } from "../../../utils/extractExperience";
import { extractSalaryFromDescription } from "../../../utils/extractSalary";
import { extractQualifications } from "../../../utils/extractEducation";
import { extractLocationFromDescription } from "../../../utils/extractLocation";
import { enrichJobById } from "./enrichJob.service";

const RAPID_API_URL = "https://jsearch.p.rapidapi.com/search";

export type JobEnrichmentMode = "inline" | "queue" | "skip";

export type FetchJobsResult = {
  totalFetched: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsFailed: number;
  queuedForEnrichment: number;
  enrichedCount: number;
  enrichmentFailed: number;
};

type FetchJobsOptions = {
  page?: number;
  enrichmentMode?: JobEnrichmentMode;
};

const shouldQueueExistingJob = (status: JobEnrichmentStatus) => {
  return status === JobEnrichmentStatus.PENDING || status === JobEnrichmentStatus.FAILED;
};

const shouldInlineEnrich = (isNewJob: boolean, status: JobEnrichmentStatus) => {
  return isNewJob || status !== JobEnrichmentStatus.COMPLETED;
};

export const fetchJobsFromApi = async (
  query: string,
  { page = 1, enrichmentMode = "inline" }: FetchJobsOptions = {}
): Promise<FetchJobsResult> => {
  const options = {
    method: "GET",
    url: RAPID_API_URL,
    params: {
      query,
      page,
      num_pages: "1",
      country: "in",
      date_posted: "month",
    },
    headers: {
      "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
      "x-rapidapi-host": process.env.RAPIDAPI_HOST!,
    },
  };

  const response = await axios.request(options);
  const jobs = response.data?.data || [];

  let jobsCreated = 0;
  let jobsUpdated = 0;
  let jobsFailed = 0;
  let queuedForEnrichment = 0;
  let enrichedCount = 0;
  let enrichmentFailed = 0;

  for (const job of jobs) {
    try {
      const existingJob = await prisma.jobs.findUnique({
        where: {
          providerJobId: job.job_id,
        },
        select: {
          id: true,
          enrichmentStatus: true,
        },
      });

      const description = job.job_description ?? "";
      const experience = extractExperience(description);
      const salary = extractSalaryFromDescription(description);
      const extractedLocation =
        job.job_city && job.job_state
          ? {}
          : extractLocationFromDescription(description);

      const dbJob = await prisma.jobs.upsert({
        where: {
          providerJobId: job.job_id,
        },
        update: {
          lastFetchedAt: new Date(),
          providerName: job.job_publisher,
          title: job.job_title,
          description: job.job_description,
          employmentType: job.job_employment_type,
          isRemote: job.job_is_remote ?? false,
          companyName: job.employer_name,
          companyLogo: job.employer_logo,
          companyWebsite: job.employer_website,
          location: job.job_location,
          city: job.job_city ?? extractedLocation.city ?? null,
          state: job.job_state ?? extractedLocation.state ?? null,
          country: job.job_country ?? extractedLocation.country ?? null,
          applyUrl: job.job_apply_link,
          postedAt: job.job_posted_at,
          postedAtUtc: job.job_posted_at_datetime_utc
            ? new Date(job.job_posted_at_datetime_utc)
            : null,
          minSalary: job.job_min_salary ?? salary.min ?? null,
          maxSalary: job.job_max_salary ?? salary.max ?? null,
          salaryPeriod: job.job_salary_period ?? salary.period ?? null,
          experienceRaw: experience.experienceRaw ?? [],
          minExperienceYears: experience.minExperienceYears ?? null,
          maxExperienceYears: experience.maxExperienceYears ?? null,
          qualifications: extractQualifications(description),
          responsibilities: job.job_highlights?.Responsibilities ?? [],
        },
        create: {
          providerJobId: job.job_id,
          providerName: job.job_publisher,
          title: job.job_title,
          description: job.job_description,
          employmentType: job.job_employment_type,
          isRemote: job.job_is_remote ?? false,
          companyName: job.employer_name,
          companyLogo: job.employer_logo,
          companyWebsite: job.employer_website,
          location: job.job_location,
          city: job.job_city ?? extractedLocation.city ?? null,
          state: job.job_state ?? extractedLocation.state ?? null,
          country: job.job_country ?? extractedLocation.country ?? null,
          applyUrl: job.job_apply_link,
          minSalary: job.job_min_salary ?? salary.min ?? null,
          maxSalary: job.job_max_salary ?? salary.max ?? null,
          salaryPeriod: job.job_salary_period ?? salary.period ?? null,
          postedAt: job.job_posted_at,
          postedAtUtc: job.job_posted_at_datetime_utc
            ? new Date(job.job_posted_at_datetime_utc)
            : null,
          lastFetchedAt: new Date(),
          experienceRaw: experience.experienceRaw ?? [],
          minExperienceYears: experience.minExperienceYears ?? null,
          maxExperienceYears: experience.maxExperienceYears ?? null,
          qualifications: extractQualifications(description),
          responsibilities: job.job_highlights?.Responsibilities ?? [],
        },
      });

      const isNewJob = !existingJob;

      if (isNewJob) {
        jobsCreated += 1;
      } else {
        jobsUpdated += 1;
      }

      if (enrichmentMode === "queue") {
        if (isNewJob) {
          queuedForEnrichment += 1;
        } else if (shouldQueueExistingJob(dbJob.enrichmentStatus)) {
          await prisma.jobs.update({
            where: { id: dbJob.id },
            data: {
              enrichmentStatus: JobEnrichmentStatus.PENDING,
              enrichmentQueuedAt: new Date(),
              enrichmentLastError: null,
            },
          });
          queuedForEnrichment += 1;
        }
      }

      if (enrichmentMode === "inline" && shouldInlineEnrich(isNewJob, dbJob.enrichmentStatus)) {
        try {
          await enrichJobById(dbJob.id);
          enrichedCount += 1;
        } catch (error) {
          enrichmentFailed += 1;
          console.log("Failed to enrich fetched job", dbJob.id, error);
        }
      }
    } catch (error) {
      jobsFailed += 1;
      console.log("Failed to upsert fetched job", job?.job_id, error);
    }
  }

  return {
    totalFetched: jobs.length,
    jobsCreated,
    jobsUpdated,
    jobsFailed,
    queuedForEnrichment,
    enrichedCount,
    enrichmentFailed,
  };
};
