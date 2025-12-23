import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes";
import jobRoutes from "./modules/jobs/jobs.routes"
import applicationRoutes from "./modules/applications/application.routes"
import resumeRoutes from "./modules/resume/resume.routes"

const router = Router();

router.use("/auth", authRoutes);
router.use("/job", jobRoutes)
router.use("/application", applicationRoutes)
router.use("/resume", resumeRoutes)

export default router;  
