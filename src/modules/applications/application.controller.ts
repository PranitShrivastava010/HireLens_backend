import { Request, Response } from "express";
import { applyJobService } from "./service/applyJob.service";
import { ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES } from "../../constants";

export const applyJobController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { jobId, statusKey, interviewDate } = req.body;

    if (!jobId || !statusKey) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: ERROR_MESSAGES.JOBID_AND_STATUS_NOT_FOUND.code,
        message: ERROR_MESSAGES.JOBID_AND_STATUS_NOT_FOUND.message,
      });
    }

    const application = await applyJobService({
      userId,
      jobId,
      statusKey,
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.APPLICATION_SUCCESS.code,
      message: SUCCESS_MESSAGES.APPLICATION_SUCCESS.message,
      data: application,
    });

  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};