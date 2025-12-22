import { Router } from "express";
import { applyJobController } from "./application.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router()

router.post("/apply", authMiddleware, applyJobController)

export default router