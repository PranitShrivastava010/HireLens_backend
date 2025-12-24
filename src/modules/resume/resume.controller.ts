import { Request, Response } from "express";
import { uploadResumeService } from "./service/resumeUpload.service";
import { atsScoreCalculateService } from "./service/atsScoreCalculate.service";
import { uploadToSupabase } from "../../config/multer";

export const uploadResumeController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    const userId = req.user!.userId; // make sure authMiddleware sets this

    console.log("STEP 1: before Supabase upload");
    const filePath = await uploadToSupabase(req.file);
    console.log("STEP 1: after Supabase upload", filePath);

    console.log("STEP 2: before Prisma insert");
    const resume = await uploadResumeService(userId, filePath, req.file.buffer);
    console.log("STEP 2: after Prisma insert", resume.id);

    return res.status(201).json({
      success: true,
      message: "Resume uploaded & processed successfully",
      resumeId: resume.id,
    });
  } catch (error: any) {
    console.error("Upload Resume Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      meta: error.meta
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