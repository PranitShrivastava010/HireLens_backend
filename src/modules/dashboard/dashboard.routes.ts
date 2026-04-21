import { Router } from "express";
import { getDashboardStatsController, updateWeeklyGoalController } from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/stats", authMiddleware, getDashboardStatsController);
router.patch("/goal", authMiddleware, updateWeeklyGoalController);

export default router;
