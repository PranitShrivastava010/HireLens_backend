import { Router } from "express";
import { fetchJobsController, fetchJobsKeywordController, getJobByIdController, getJobsController, getRoleSkillController, getUserPreferencesController, saveUserPreferencesController } from "./jobs.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

import { validate } from "../../middlewares/validate.middleware";
import { fetchJobsSchema, jobPreferenceSchema } from "./jobs.schema";

const router = Router();

router.post("/fetch", authMiddleware, validate(fetchJobsSchema), fetchJobsController);
router.get("/", authMiddleware, getJobsController)
router.get("/roleSkill", authMiddleware, getRoleSkillController)
router.post("/preference", authMiddleware, validate(jobPreferenceSchema), saveUserPreferencesController)
router.get("/userPreference", authMiddleware, getUserPreferencesController)
router.get("/:id", authMiddleware, getJobByIdController)
router.post("/:jobId/keywords", authMiddleware, fetchJobsKeywordController)


export default router;
