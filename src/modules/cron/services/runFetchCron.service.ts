import {
  FetchRunStatus,
  Prisma,
  FetchTriggerType,
  JobFetchTarget,
  JobFetchRunItemType,
  JobPipelineStage,
} from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { fetchJobsFromApi } from "../../jobs/services/fetchJobs.service";
import { acquireCronLock, releaseCronLock } from "./cronLock.service";
import { refreshFetchTargetDemandScores } from "./refreshFetchTargetDemandScores.service";
import {
  addMinutes,
  calculateBackoffMinutes,
  chunkArray,
  getPositiveInt,
  withRetry,
} from "./scheduler.utils";

const FETCH_LOCK_KEY = "cron:job-fetch:lock";

type RunFetchCronOptions = {
  triggerType?: FetchTriggerType;
};

type FetchTargetRunResult = {
  status: FetchRunStatus;
  jobsFetched: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsFailed: number;
};

type JobFetchRunRecord = Awaited<ReturnType<typeof prisma.jobFetchRun.create>>;
type JobFetchRunItemRecord = Awaited<ReturnType<typeof prisma.jobFetchRunItem.create>>;

const logFetchCronError = (message: string, error: unknown, meta?: Record<string, unknown>) => {
  console.error("[fetch cron]", message, {
    ...(meta ?? {}),
    error,
  });
};

const ensureFetchDatabaseReady = async () => {
  await withRetry(
    async () => {
      await prisma.$connect();
      await prisma.$queryRawUnsafe("SELECT 1");
    },
    {
      attempts: 5,
      delayMs: 2000,
    }
  );
};

const updateFetchRunWithRetry = async (
  runId: string,
  data: Prisma.JobFetchRunUpdateArgs["data"]
) => {
  return withRetry(
    () =>
      prisma.jobFetchRun.update({
        where: { id: runId },
        data,
      }),
    {
      attempts: 5,
      delayMs: 2000,
    }
  );
};

const createFetchRunWithRetry = (
  data: Prisma.JobFetchRunCreateArgs["data"]
): Promise<JobFetchRunRecord> => {
  return withRetry(
    () =>
      prisma.jobFetchRun.create({
        data,
      }),
    {
      attempts: 5,
      delayMs: 2000,
    }
  );
};

const createFetchRunItemWithRetry = (
  data: Prisma.JobFetchRunItemCreateArgs["data"]
): Promise<JobFetchRunItemRecord> => {
  return withRetry(
    () =>
      prisma.jobFetchRunItem.create({
        data,
      }),
    {
      attempts: 5,
      delayMs: 2000,
    }
  );
};

const updateFetchRunItemWithRetry = (
  runItemId: string,
  data: Prisma.JobFetchRunItemUpdateArgs["data"]
) => {
  return withRetry(
    () =>
      prisma.jobFetchRunItem.update({
        where: { id: runItemId },
        data,
      }),
    {
      attempts: 5,
      delayMs: 2000,
    }
  );
};

const updateFetchTargetWithRetry = (
  targetId: string,
  data: Prisma.JobFetchTargetUpdateArgs["data"]
) => {
  return withRetry(
    () =>
      prisma.jobFetchTarget.update({
        where: { id: targetId },
        data,
      }),
    {
      attempts: 5,
      delayMs: 2000,
    }
  );
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

export const runFetchCron = async ({
  triggerType = FetchTriggerType.CRON,
}: RunFetchCronOptions = {}) => {
  const startedAt = new Date();
  const batchSize = getPositiveInt(process.env.JOB_FETCH_TARGET_BATCH_SIZE, 5);
  const concurrency = getPositiveInt(process.env.JOB_FETCH_TARGET_CONCURRENCY, 2);
  const lockTtlSeconds = getPositiveInt(process.env.JOB_FETCH_LOCK_TTL_SECONDS, 900);

  const lock = await acquireCronLock(FETCH_LOCK_KEY, lockTtlSeconds);

  if (!lock.acquired) {
    const skippedRun: JobFetchRunRecord = await createFetchRunWithRetry({
      stage: JobPipelineStage.FETCH,
      triggerType,
      status: FetchRunStatus.SKIPPED,
      startedAt,
      endedAt: new Date(),
      durationMs: 0,
      errorMessage: "Skipped because a fetch cron lock is already active",
    });

    return {
      runId: skippedRun.id,
      skipped: true,
      message: skippedRun.errorMessage,
    };
  }

  let runId: string | null = null;

  try {
    await ensureFetchDatabaseReady();

    const run: JobFetchRunRecord = await createFetchRunWithRetry({
      stage: JobPipelineStage.FETCH,
      triggerType,
      status: FetchRunStatus.RUNNING,
      startedAt,
    });
    runId = run.id;

    try {
      await refreshFetchTargetDemandScores();
    } catch (error) {
      logFetchCronError("Demand score refresh failed; continuing with existing scores", error);
    }

    const now = new Date();
    const dueTargets: JobFetchTarget[] = await withRetry(
      () =>
        prisma.jobFetchTarget.findMany({
          where: {
            isActive: true,
            OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
            AND: [
              {
                OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
              },
            ],
          },
          orderBy: [
            { priority: "desc" },
            { demandScore: "desc" },
            { lastFetchedAt: "asc" },
          ],
          take: batchSize,
        }),
      {
        attempts: 5,
        delayMs: 2000,
      }
    );

    if (!dueTargets.length) {
      const endedAt = new Date();

      await updateFetchRunWithRetry(run.id, {
        status: FetchRunStatus.SKIPPED,
        endedAt,
        durationMs: endedAt.getTime() - startedAt.getTime(),
        errorMessage: "No due fetch targets were available",
      });

      return {
        runId: run.id,
        skipped: true,
        message: "No due fetch targets were available",
      };
    }

    try {
      await updateFetchRunWithRetry(run.id, {
        itemsPlanned: dueTargets.length,
      });
    } catch (error) {
      logFetchCronError("Failed to persist planned-item count; continuing", error, {
        runId: run.id,
        dueTargets: dueTargets.length,
      });
    }

    const results: FetchTargetRunResult[] = [];

    for (const batch of chunkArray(dueTargets, Math.max(concurrency, 1))) {
      const batchResults = await Promise.all(
        batch.map(async (target) => {
          const itemStartedAt = new Date();
          let runItemId: string | null = null;

          try {
            const runItem = await createFetchRunItemWithRetry({
              runId: run.id,
              targetId: target.id,
              itemType: JobFetchRunItemType.TARGET,
              label: target.name,
              query: target.query,
              status: FetchRunStatus.RUNNING,
              startedAt: itemStartedAt,
            });
            runItemId = runItem.id;

            const fetchResult = await withRetry(
              () =>
                fetchJobsFromApi(target.query, {
                  page: 1,
                  enrichmentMode: "queue",
                }),
              {
                attempts: 3,
                delayMs: 1500,
              }
            );

            const itemEndedAt = new Date();

            const successUpdates = await Promise.allSettled([
              updateFetchRunItemWithRetry(runItem.id, {
                status: FetchRunStatus.SUCCESS,
                endedAt: itemEndedAt,
                durationMs: itemEndedAt.getTime() - itemStartedAt.getTime(),
                jobsFetched: fetchResult.totalFetched,
                jobsCreated: fetchResult.jobsCreated,
                jobsUpdated: fetchResult.jobsUpdated,
                jobsFailed: fetchResult.jobsFailed,
              }),
              updateFetchTargetWithRetry(target.id, {
                lastFetchedAt: itemEndedAt,
                lastSuccessAt: itemEndedAt,
                failureCount: 0,
                cooldownUntil: null,
                nextRunAt: addMinutes(itemEndedAt, target.refreshEveryMinutes),
              }),
            ]);

            const failedSuccessUpdates = successUpdates.filter(
              (result) => result.status === "rejected"
            );

            if (failedSuccessUpdates.length) {
              logFetchCronError(
                "Processed target but failed to persist all success metadata",
                null,
                {
                  targetId: target.id,
                  targetName: target.name,
                  failures: failedSuccessUpdates.map((result) =>
                    result.status === "rejected" ? result.reason : undefined
                  ),
                }
              );
            }

            return {
              status: FetchRunStatus.SUCCESS,
              jobsFetched: fetchResult.totalFetched,
              jobsCreated: fetchResult.jobsCreated,
              jobsUpdated: fetchResult.jobsUpdated,
              jobsFailed: fetchResult.jobsFailed,
            };
          } catch (error) {
            const itemEndedAt = new Date();
            const failureCount = target.failureCount + 1;
            const errorMessage =
              error instanceof Error ? error.message : "Fetch cron item failed";

            logFetchCronError("Target processing failed", error, {
              targetId: target.id,
              targetName: target.name,
              query: target.query,
            });

            const failureUpdates = await Promise.allSettled([
              runItemId
                ? updateFetchRunItemWithRetry(runItemId, {
                    status: FetchRunStatus.FAILED,
                    endedAt: itemEndedAt,
                    durationMs: itemEndedAt.getTime() - itemStartedAt.getTime(),
                    jobsFailed: 1,
                    errorMessage,
                  })
                : Promise.resolve(null),
              updateFetchTargetWithRetry(target.id, {
                lastFetchedAt: itemEndedAt,
                lastFailureAt: itemEndedAt,
                failureCount,
                cooldownUntil: addMinutes(
                  itemEndedAt,
                  calculateBackoffMinutes(failureCount)
                ),
                nextRunAt: addMinutes(
                  itemEndedAt,
                  calculateBackoffMinutes(failureCount)
                ),
              }),
            ]);

            const failedFailureUpdates = failureUpdates.filter(
              (result) => result.status === "rejected"
            );

            if (failedFailureUpdates.length) {
              logFetchCronError("Failed to persist target failure metadata", null, {
                targetId: target.id,
                targetName: target.name,
                failures: failedFailureUpdates.map((result) =>
                  result.status === "rejected" ? result.reason : undefined
                ),
              });
            }

            return {
              status: FetchRunStatus.FAILED,
              jobsFetched: 0,
              jobsCreated: 0,
              jobsUpdated: 0,
              jobsFailed: 1,
            };
          }
        })
      );

      results.push(...batchResults);
    }

    const successes = results.filter((result) => result.status === FetchRunStatus.SUCCESS).length;
    const failures = results.filter((result) => result.status === FetchRunStatus.FAILED).length;
    const endedAt = new Date();
    const status = determineRunStatus(successes, failures, results.length);

    const summary = {
      itemsProcessed: results.length,
      jobsFetched: results.reduce((sum, result) => sum + result.jobsFetched, 0),
      jobsCreated: results.reduce((sum, result) => sum + result.jobsCreated, 0),
      jobsUpdated: results.reduce((sum, result) => sum + result.jobsUpdated, 0),
      jobsFailed: results.reduce((sum, result) => sum + result.jobsFailed, 0),
    };

    await updateFetchRunWithRetry(run.id, {
      status,
      endedAt,
      durationMs: endedAt.getTime() - startedAt.getTime(),
      ...summary,
    });

    return {
      runId: run.id,
      skipped: false,
      status,
      ...summary,
    };
  } catch (error) {
    const endedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : "Fetch cron failed";

    logFetchCronError("Run failed before completion", error, {
      runId,
    });

    if (runId) {
      const failureUpdate = await Promise.allSettled([
        updateFetchRunWithRetry(runId, {
          status: FetchRunStatus.FAILED,
          endedAt,
          durationMs: endedAt.getTime() - startedAt.getTime(),
          errorMessage,
        }),
      ]);

      if (failureUpdate.some((result) => result.status === "rejected")) {
        logFetchCronError("Failed to persist fetch run failure summary", null, {
          runId,
          failures: failureUpdate.map((result) =>
            result.status === "rejected" ? result.reason : undefined
          ),
        });
      }
    }

    throw error;
  } finally {
    try {
      await releaseCronLock(FETCH_LOCK_KEY);
    } catch (error) {
      logFetchCronError("Failed to release fetch cron lock", error, {
        lockKey: FETCH_LOCK_KEY,
      });
    }
  }
};
