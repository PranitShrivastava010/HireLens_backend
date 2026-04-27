import { JobEnrichmentStatus } from "@prisma/client";
import axios from "axios";
import { prisma } from "../../../lib/prisma";
import { chunkArray, getPositiveInt, withRetry } from "../../cron/services/scheduler.utils";
import { extractExperience } from "../../../utils/extractExperience";
import { extractSalaryFromDescription } from "../../../utils/extractSalary";
import { extractQualifications } from "../../../utils/extractEducation";
import { extractLocationFromDescription } from "../../../utils/extractLocation";
import { enrichJobById } from "./enrichJob.service";

const RAPID_API_URL = "https://jsearch.p.rapidapi.com/search";
const DEFAULT_FETCH_API_TIMEOUT_MS = 10000;
const DEFAULT_JOB_UPSERT_CONCURRENCY = 2;

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

type ExistingFetchedJobRecord = Awaited<ReturnType<typeof prisma.jobs.findMany>>;
type UpsertedFetchedJobRecord = Awaited<ReturnType<typeof prisma.jobs.upsert>>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableFetchApiError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  if (!status) {
    return true;
  }

  return status === 429 || status >= 500;
};

const requestJobsWithRetry = async (options: Parameters<typeof axios.request>[0]) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await axios.request(options);
    } catch (error) {
      lastError = error;

      if (attempt === 3 || !isRetryableFetchApiError(error)) {
        throw error;
      }

      await sleep(1000 * attempt);
    }
  }

  throw lastError;
};

export const fetchJobsFromApi = async (
  query: string,
  { page = 1, enrichmentMode = "inline" }: FetchJobsOptions = {}
): Promise<FetchJobsResult> => {
  const options = {
    method: "GET",
    url: RAPID_API_URL,
    timeout: DEFAULT_FETCH_API_TIMEOUT_MS,
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

  const response = await requestJobsWithRetry(options);
  const jobs = response.data?.data || [];
  const providerJobIds = jobs
    .map((job: any) => job?.job_id)
    .filter((jobId: string | undefined): jobId is string => Boolean(jobId));
  const existingJobs: ExistingFetchedJobRecord = providerJobIds.length
    ? await withRetry(
        () =>
          prisma.jobs.findMany({
            where: {
              providerJobId: {
                in: providerJobIds,
              },
            },
            select: {
              id: true,
              providerJobId: true,
              enrichmentStatus: true,
            },
          }),
        {
          attempts: 5,
          delayMs: 2000,
        }
      )
    : [];
  const existingJobMap = new Map(
    existingJobs.map((job: ExistingFetchedJobRecord[number]) => [
      job.providerJobId,
      {
        id: job.id,
        enrichmentStatus: job.enrichmentStatus,
      },
    ])
  );
  const upsertConcurrency = getPositiveInt(
    process.env.JOB_FETCH_JOB_UPSERT_CONCURRENCY,
    DEFAULT_JOB_UPSERT_CONCURRENCY
  );

  let jobsCreated = 0;
  let jobsUpdated = 0;
  let jobsFailed = 0;
  let queuedForEnrichment = 0;
  let enrichedCount = 0;
  let enrichmentFailed = 0;

  for (const batch of chunkArray(jobs, Math.max(upsertConcurrency, 1))) {
    const batchResults = await Promise.all(
      batch.map(async (job: any) => {
        try {
          const existingJob = existingJobMap.get(job.job_id) ?? null;

          const description = job.job_description ?? "";
          const experience = extractExperience(description);
          const salary = extractSalaryFromDescription(description);
          const extractedLocation =
            job.job_city && job.job_state
              ? {}
              : extractLocationFromDescription(description);

          const dbJob: UpsertedFetchedJobRecord = await withRetry(
            () =>
              prisma.jobs.upsert({
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
              }),
            {
              attempts: 5,
              delayMs: 2000,
            }
          );

          const isNewJob = !existingJob;

          let queuedDelta = 0;
          let enrichedDelta = 0;
          let enrichmentFailedDelta = 0;

          if (enrichmentMode === "queue") {
            if (isNewJob) {
              queuedDelta += 1;
            } else if (shouldQueueExistingJob(dbJob.enrichmentStatus)) {
              await withRetry(
                () =>
                  prisma.jobs.update({
                    where: { id: dbJob.id },
                    data: {
                      enrichmentStatus: JobEnrichmentStatus.PENDING,
                      enrichmentQueuedAt: new Date(),
                      enrichmentLastError: null,
                    },
                  }),
                {
                  attempts: 5,
                  delayMs: 2000,
                }
              );
              queuedDelta += 1;
            }
          }

          if (
            enrichmentMode === "inline" &&
            shouldInlineEnrich(isNewJob, dbJob.enrichmentStatus)
          ) {
            try {
              await enrichJobById(dbJob.id);
              enrichedDelta += 1;
            } catch (error) {
              enrichmentFailedDelta += 1;
              console.log("Failed to enrich fetched job", dbJob.id, error);
            }
          }

          return {
            status: "SUCCESS" as const,
            isNewJob,
            queuedDelta,
            enrichedDelta,
            enrichmentFailedDelta,
          };
        } catch (error) {
          console.log("Failed to upsert fetched job", job?.job_id, error);

          return {
            status: "FAILED" as const,
          };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "FAILED") {
        jobsFailed += 1;
        continue;
      }

      if (result.isNewJob) {
        jobsCreated += 1;
      } else {
        jobsUpdated += 1;
      }

      queuedForEnrichment += result.queuedDelta;
      enrichedCount += result.enrichedDelta;
      enrichmentFailed += result.enrichmentFailedDelta;
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
