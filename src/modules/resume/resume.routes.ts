import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { resumeUpload } from "../../config/multer";
import { uploadResumeController } from "./resume.controller";

const router = Router()

router.post("/upload", authMiddleware, resumeUpload.single("resume"), uploadResumeController)

export default router