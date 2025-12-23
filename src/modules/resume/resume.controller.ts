import { Request, Response } from "express";
import { uploadResumeService } from "./service/resumeUpload.service";
import { atsScoreCalculateService } from "./service/atsScoreCalculate.service";

export const uploadResumeController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    const userId = req.user!.userId;

    const resume = await uploadResumeService(
      userId,
      req.file.path
    );

    return res.status(201).json({
      success: true,
      message: "Resume uploaded & processed successfully",
      resumeId: resume.id,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const atsScoreCalculateController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { jobId, resumeId } = req.body;

    const data = await atsScoreCalculateService({
      userId,
      jobId,
      resumeId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};