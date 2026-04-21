import { Request, Response, NextFunction } from "express";
import { getDashboardStatsService, updateWeeklyGoalService } from "./dashboard.service";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "../../constants";

export const getDashboardStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const stats = await getDashboardStatsService(userId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const updateWeeklyGoalController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { goal } = req.body;

    if (!goal || typeof goal !== 'number' || goal < 1) {
       return res.status(HTTP_STATUS.BAD_REQUEST).json({
         success: false,
         message: "Goal must be a positive number"
       });
    }

    const updated = await updateWeeklyGoalService(userId, goal);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Weekly goal updated successfully",
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
