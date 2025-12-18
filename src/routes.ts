import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes";
import jobRoutes from "./modules/jobs/jobs.routes"

const router = Router();

router.use("/auth", authRoutes);
router.use("/job", jobRoutes)

export default router;  
