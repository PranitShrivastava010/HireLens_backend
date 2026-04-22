import { FetchTriggerType, JobPipelineStage } from "@prisma/client";
import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants";
import { runEnrichCron } from "./services/runEnrichCron.service";
import { runFetchCron } from "./services/runFetchCron.service";

const getTriggerType = (req: Request) => {
  return req.get("user-agent") === "vercel-cron/1.0"
    ? FetchTriggerType.CRON
    : FetchTriggerType.MANUAL;
};

const authorizeCronRequest = (req: Request, res: Response) => {
  if (!process.env.CRON_SECRET) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: "CRON_SECRET_MISSING",
      message: "CRON_SECRET is not configured",
    });
    return false;
  }

  if (req.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      code: "UNAUTHORIZED",
      message: "Invalid cron authorization",
    });
    return false;
  }

  return true;
};

const handleCronError = (res: Response, stage: JobPipelineStage, error: unknown) => {
  const message = error instanceof Error ? error.message : `Failed to run ${stage} cron`;

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    code: "CRON_RUN_FAILED",
    message,
    stage,
  });
};

export const runFetchCronController = async (req: Request, res: Response) => {
  if (!authorizeCronRequest(req, res)) {
    return;
  }

  try {
    const result = await runFetchCron({
      triggerType: getTriggerType(req),
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      stage: JobPipelineStage.FETCH,
      data: result,
    });
  } catch (error) {
    handleCronError(res, JobPipelineStage.FETCH, error);
  }
};

export const runEnrichCronController = async (req: Request, res: Response) => {
  if (!authorizeCronRequest(req, res)) {
    return;
  }

  try {
    const result = await runEnrichCron({
      triggerType: getTriggerType(req),
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      stage: JobPipelineStage.ENRICH,
      data: result,
    });
  } catch (error) {
    handleCronError(res, JobPipelineStage.ENRICH, error);
  }
};
