import { Router } from "express";
import { fetchJobsController, getJobByIdController, getJobsController } from "./jobs.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/fetch", authMiddleware, fetchJobsController);
router.get("/", authMiddleware, getJobsController)
router.get("/:id", authMiddleware, getJobByIdController)

export default router;
