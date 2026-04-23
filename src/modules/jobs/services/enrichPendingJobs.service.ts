import { JobEnrichmentStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { withRetry } from "../../cron/services/scheduler.utils";
import { enrichJobById } from "./enrichJob.service";

type EnrichPendingJobsOptions = {
  limit?: number;
  concurrency?: number;
};

type EnrichPendingJobsResult = {
  jobsSelected: number;
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  processedJobs: Array<{
    id: string;
    title: string;
    status: "SUCCESS" | "FAILED";
    startedAt: Date;
    endedAt: Date;
    durationMs: number;
    errorMessage?: string;
  }>;
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const enrichPendingJobs = async ({
  limit = 10,
  concurrency = 2,
}: EnrichPendingJobsOptions = {}): Promise<EnrichPendingJobsResult> => {
  const jobs: Array<{ id: string; title: string }> = await withRetry(() =>
    prisma.jobs.findMany({
      where: {
        enrichmentStatus: {
          in: [JobEnrichmentStatus.PENDING, JobEnrichmentStatus.FAILED],
        },
        enrichmentAttempts: {
          lt: 5,
        },
      },
      orderBy: [
        { enrichmentQueuedAt: "asc" },
        { lastFetchedAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
      },
      take: limit,
    })
  );

  const processedJobs: EnrichPendingJobsResult["processedJobs"] = [];

  for (const chunk of chunkArray(jobs, Math.max(concurrency, 1))) {
    const results = await Promise.all(
      chunk.map(async (job) => {
        const startedAt = new Date();

        try {
          await enrichJobById(job.id);
          const endedAt = new Date();

          return {
            id: job.id,
            title: job.title,
            status: "SUCCESS" as const,
            startedAt,
            endedAt,
            durationMs: endedAt.getTime() - startedAt.getTime(),
          };
        } catch (error) {
          const endedAt = new Date();

          return {
            id: job.id,
            title: job.title,
            status: "FAILED" as const,
            startedAt,
            endedAt,
            durationMs: endedAt.getTime() - startedAt.getTime(),
            errorMessage:
              error instanceof Error ? error.message : "Failed to enrich job",
          };
        }
      })
    );

    processedJobs.push(...results);
  }

  return {
    jobsSelected: jobs.length,
    jobsProcessed: processedJobs.length,
    jobsSucceeded: processedJobs.filter((job) => job.status === "SUCCESS").length,
    jobsFailed: processedJobs.filter((job) => job.status === "FAILED").length,
    processedJobs,
  };
};
