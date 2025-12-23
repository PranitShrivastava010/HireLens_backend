import { Request, Response } from "express";
import { applyJobService } from "./service/applyJob.service";
import { ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES } from "../../constants";
import { getUserJobApplicationsService } from "./service/getAppliedJobs.service";
import { updateApplicationStatusService } from "./service/updateApplicationStatus.service";

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

export const getUserJobApplicationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const data = await getUserJobApplicationsService(userId);

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateApplicationStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const { applicationId, newStatusKey, interviewDate } = req.body;

    const updated = await updateApplicationStatusService({
      applicationId,
      newStatusKey,
      interviewDate,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};