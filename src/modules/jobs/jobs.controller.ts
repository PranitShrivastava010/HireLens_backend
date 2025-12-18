// src/modules/jobs/jobs.controller.ts
import { Request, Response } from "express";
import { fetchJobsFromApi } from "./services/fetchJobs.service";
import { PrismaClient } from "@prisma/client";
import { getJobsService } from "./services/getJobs.service";
import { getJobByIdService } from "./services/getJobsById.service";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "../../constants";

const prisma = new PrismaClient();

export const fetchJobsController = async (req: Request, res: Response) => {
  try {
    const { query, page } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    const count = await fetchJobsFromApi(
      query as string,
      Number(page) || 1
    );

    res.json({
      success: true,
      message: `${count} jobs fetched and stored`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
    });
  }
};

export const getJobsController = async (req: Request, res: Response) => {
  try {
    const { search, location, isRemote, page, limit } = req.query;

    const result = await getJobsService({
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
    });
  }
};

export const getJobByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await getJobByIdService(id);

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
