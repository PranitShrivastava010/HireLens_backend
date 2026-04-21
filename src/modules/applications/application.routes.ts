import { Router } from "express";
import { applyJobController, getUserJobApplicationsController, updateApplicationStatusController } from "./application.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

import { validate } from "../../middlewares/validate.middleware";
import { applyJobSchema, updateApplicationStatusSchema } from "./application.schema";

const router = Router()

router.post("/apply", authMiddleware, validate(applyJobSchema), applyJobController)
router.get("/get", authMiddleware, getUserJobApplicationsController)
router.patch("/status", authMiddleware, validate(updateApplicationStatusSchema), updateApplicationStatusController)

export default router