import { Router } from "express";
import { fetchJobsController, fetchJobsKeywordController, getJobByIdController, getJobsController, getRoleSkillController, getUserPreferencesController, saveUserPreferencesController } from "./jobs.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/fetch", authMiddleware, fetchJobsController);
router.get("/", authMiddleware, getJobsController)
router.get("/roleSkill", authMiddleware, getRoleSkillController)
router.post("/preference", authMiddleware, saveUserPreferencesController)
router.get("/userPreference", authMiddleware, getUserPreferencesController)
router.get("/:id", authMiddleware, getJobByIdController)
router.post("/:jobId/keywords", authMiddleware, fetchJobsKeywordController)


export default router;
