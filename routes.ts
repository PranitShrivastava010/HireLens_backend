import { Router } from "express";
import authRoutes from "./src/modules/auth/auth.routes";
import jobRoutes from "./src/modules/jobs/jobs.routes"
import applicationRoutes from "./src/modules/applications/application.routes"
import resumeRoutes from "./src/modules/resume/resume.routes"

const router = Router();

router.use("/auth", authRoutes);
router.use("/job", jobRoutes)
router.use("/application", applicationRoutes)
router.use("/resume", resumeRoutes)

export default router;  
