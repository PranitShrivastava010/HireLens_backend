import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes";
import jobRoutes from "./modules/jobs/jobs.routes"
import applicationRoutes from "./modules/applications/application.routes"
import resumeRoutes from "./modules/resume/resume.routes"
import dashboardRoutes from "./modules/dashboard/dashboard.routes"
import cronRoutes from "./modules/cron/cron.routes"
import outreachRoutes from "./modules/outreach/outreach.routes"

const router = Router();

router.use("/auth", authRoutes);
router.use("/job", jobRoutes)
router.use("/application", applicationRoutes)
router.use("/resume", resumeRoutes)
router.use("/dashboard", dashboardRoutes)
router.use("/cron", cronRoutes)
router.use("/outreach", outreachRoutes)

export default router;  
