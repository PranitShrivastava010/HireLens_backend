import { Router } from "express";
import { applyJobController, getUserJobApplicationsController, updateApplicationStatusController } from "./application.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router()

router.post("/apply", authMiddleware, applyJobController)
router.get("/get", authMiddleware, getUserJobApplicationsController)
router.patch("/status", authMiddleware, updateApplicationStatusController)

export default router