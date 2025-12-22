import { Request, Response } from "express";
import { uploadResumeService } from "./service/resumeUpload.service";

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

    const userId = req.user!.userId; // from auth middleware

    const resume = await uploadResumeService(
      userId,
      req.file.path
    );

    return res.status(201).json({
      success: true,
      message: "Resume uploaded successfully",
      resume,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};