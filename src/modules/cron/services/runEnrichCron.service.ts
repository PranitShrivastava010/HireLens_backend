import {
  FetchRunStatus,
  FetchTriggerType,
  JobFetchRunItemType,
  JobPipelineStage,
} from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { enrichPendingJobs } from "../../jobs/services/enrichPendingJobs.service";
import { acquireCronLock, releaseCronLock } from "./cronLock.service";
import { getPositiveInt } from "./scheduler.utils";

const ENRICH_LOCK_KEY = "cron:job-enrich:lock";

type RunEnrichCronOptions = {
  triggerType?: FetchTriggerType;
};

const determineRunStatus = (
  successes: number,
  failures: number,
  processed: number
) => {
  if (processed === 0) {
    return FetchRunStatus.SKIPPED;
  }

  if (failures === 0) {
    return FetchRunStatus.SUCCESS;
  }

  if (successes === 0) {
    return FetchRunStatus.FAILED;
  }

  return FetchRunStatus.PARTIAL;
};

export const runEnrichCron = async ({
  triggerType = FetchTriggerType.CRON,
}: RunEnrichCronOptions = {}) => {
  const startedAt = new Date();
  const batchSize = getPositiveInt(process.env.JOB_ENRICH_BATCH_SIZE, 10);
  const concurrency = getPositiveInt(process.env.JOB_ENRICH_CONCURRENCY, 2);
  const lockTtlSeconds = getPositiveInt(process.env.JOB_ENRICH_LOCK_TTL_SECONDS, 900);

  const lock = await acquireCronLock(ENRICH_LOCK_KEY, lockTtlSeconds);

  if (!lock.acquired) {
    const skippedRun = await prisma.jobFetchRun.create({
      data: {
        stage: JobPipelineStage.ENRICH,
        triggerType,
        status: FetchRunStatus.SKIPPED,
        startedAt,
        endedAt: new Date(),
        durationMs: 0,
        errorMessage: "Skipped because an enrich cron lock is already active",
      },
    });

    return {
      runId: skippedRun.id,
      skipped: true,
      message: skippedRun.errorMessage,
    };
  }

  const run = await prisma.jobFetchRun.create({
    data: {
      stage: JobPipelineStage.ENRICH,
      triggerType,
      status: FetchRunStatus.RUNNING,
      startedAt,
    },
  });

  try {
    const enrichmentResult = await enrichPendingJobs({
      limit: batchSize,
      concurrency,
    });

    if (!enrichmentResult.jobsSelected) {
      const endedAt = new Date();

      await prisma.jobFetchRun.update({
        where: { id: run.id },
        data: {
          status: FetchRunStatus.SKIPPED,
          endedAt,
          durationMs: endedAt.getTime() - startedAt.getTime(),
          errorMessage: "No jobs were waiting for enrichment",
        },
      });

      return {
        runId: run.id,
        skipped: true,
        message: "No jobs were waiting for enrichment",
      };
    }

    await prisma.jobFetchRun.update({
      where: { id: run.id },
      data: {
        itemsPlanned: enrichmentResult.jobsSelected,
      },
    });

    await Promise.all(
      enrichmentResult.processedJobs.map((job) =>
        prisma.jobFetchRunItem.create({
          data: {
            runId: run.id,
            itemType: JobFetchRunItemType.JOB,
            label: job.title,
            status:
              job.status === "SUCCESS"
                ? FetchRunStatus.SUCCESS
                : FetchRunStatus.FAILED,
            startedAt: job.startedAt,
            endedAt: job.endedAt,
            durationMs: job.durationMs,
            jobsUpdated: job.status === "SUCCESS" ? 1 : 0,
            jobsFailed: job.status === "FAILED" ? 1 : 0,
            errorMessage: job.errorMessage,
          },
        })
      )
    );

    const endedAt = new Date();
    const status = determineRunStatus(
      enrichmentResult.jobsSucceeded,
      enrichmentResult.jobsFailed,
      enrichmentResult.jobsProcessed
    );

    await prisma.jobFetchRun.update({
      where: { id: run.id },
      data: {
        status,
        endedAt,
        durationMs: endedAt.getTime() - startedAt.getTime(),
        itemsProcessed: enrichmentResult.jobsProcessed,
        jobsUpdated: enrichmentResult.jobsSucceeded,
        jobsFailed: enrichmentResult.jobsFailed,
      },
    });

    return {
      runId: run.id,
      skipped: false,
      status,
      itemsProcessed: enrichmentResult.jobsProcessed,
      jobsUpdated: enrichmentResult.jobsSucceeded,
      jobsFailed: enrichmentResult.jobsFailed,
    };
  } catch (error) {
    const endedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : "Enrich cron failed";

    await prisma.jobFetchRun.update({
      where: { id: run.id },
      data: {
        status: FetchRunStatus.FAILED,
        endedAt,
        durationMs: endedAt.getTime() - startedAt.getTime(),
        errorMessage,
      },
    });

    throw error;
  } finally {
    await releaseCronLock(ENRICH_LOCK_KEY);
  }
};
