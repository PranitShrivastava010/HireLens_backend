// src/modules/jobs/jobs.controller.ts
import { Request, Response } from "express";
import { fetchJobsFromApi } from "./services/fetchJobs.service";
import { getJobsService } from "./services/getJobs.service";
import { getJobByIdService } from "./services/getJobsById.service";
import { ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES } from "../../constants";
import { fetchJobKeywordsService } from "./services/fetchJobsKeywords.service";
import { getRoleSkillService } from "./services/getRoleSkill.service";
import { saveUserPreferencesService } from "./services/userPreference.service";
import { getUserPreferencesService } from "./services/getPreference.service";
import { prisma } from "../../lib/prisma";

export const fetchJobsController = async (req: Request, res: Response) => {
  try {
    const { query, page } = req.body;

    const result = await fetchJobsFromApi(query, {
      page: typeof page === "number" ? page : 1,
      enrichmentMode: "inline",
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.JOBS_FETCHED.code,
      message: SUCCESS_MESSAGES.JOBS_FETCHED.message,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      code: ERROR_MESSAGES.SOMETHING_WENT_WRONG.code,
      message: ERROR_MESSAGES.SOMETHING_WENT_WRONG.message,
      Error: error
    });
  }
};

export const getJobsController = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { search, location, isRemote, page, limit } = req.query;

    const result = await getJobsService({
      userId: req.user.userId,
      search: search as string,
      location: location as string,
      isRemote:
        isRemote !== undefined ? isRemote === "true" : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error in getJobsController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      Error: error.message || error,
    });
  }
};

export const getJobByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const job = await getJobByIdService(id, userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.JOBS_FETCHED.code,
      message: SUCCESS_MESSAGES.JOBS_FETCHED.message,
      data: job,
    });
  } catch (error: any) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: error.message,
    });
  }
};

export const fetchJobsKeywordController = async (
  req: Request,
  res: Response
) => {
  try {
    const { jobId } = req.params;

    // 1. Generate keywords (cached)
    await fetchJobKeywordsService(jobId);

    // 2. Fetch keywords
    const keywords = await prisma.jobKeyword.findMany({
      where: { jobId },
      orderBy: { score: "desc" },
    });

    return res.status(200).json({
      success: true,
      keywords,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to prepare apply",
    });
  }
};

export const getRoleSkillController = async (
  req: Request,
  res: Response
) => {
  try {
    const q = String(req.query.q || "");
    const limit = Number(req.query.limit || 10);

    if (q.length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const data = await getRoleSkillService({ query: q, limit });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Autocomplete failed",
    });
  }
};

export const saveUserPreferencesController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { roleSlugs = [], skillSlugs = [] } = req.body;

    console.log("Raw body", req.body)
    console.log("roleSlugs:", req.body?.roleSlugs);
    console.log("skillSlugs:", req.body?.skillSlugs);

    await saveUserPreferencesService({
      userId,
      roleSlugs,
      skillSlugs,
    });

    res.status(200).json({
      success: true,
      message: "Preferences saved",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserPreferencesController = async (
  req: Request,
  res: Response
) => {
  try {
    // auth middleware guarantee
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const data = await getUserPreferencesService(req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch preferences",
    });
  }
};
