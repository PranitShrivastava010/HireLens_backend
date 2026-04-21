import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { resumeUpload } from "../../config/multer";
import {
  atsScoreCalculateController,
  uploadResumeController,
  createInitialResumeController,
  getResumeController,
  updateResumeTitleController,
  updateBasicsController,
  createExperienceController,
  updateExperienceController,
  deleteExperienceController,
  reorderExperiencesController,
  createEducationController,
  updateEducationController,
  deleteEducationController,
  createSkillController,
  updateSkillController,
  deleteSkillController,
  createProjectController,
  updateProjectController,
  deleteProjectController,
  createCertificationController,
  updateCertificationController,
  deleteCertificationController,
  getResumePreviewController,
} from "./resume.controller";

const router = Router();

router.use(authMiddleware);

// ============================================
// RESUME MAIN ROUTES
// ============================================

// POST /api/resume - Create or get existing resume
router.post("/", createInitialResumeController);

// GET /api/resume - Get full resume
router.get("/", getResumeController);

// PUT /api/resume/title - Update resume title
router.put("/title", updateResumeTitleController);

// ============================================
// RESUME BASICS ROUTES
// ============================================

// PUT /api/resume/basics - Update basics
router.put("/basics", updateBasicsController);

// ============================================
// RESUME EXPERIENCE ROUTES
// ============================================

// POST /api/resume/experience - Create experience
router.post("/experience", createExperienceController);

// PUT /api/resume/experience/:experienceId - Update experience
router.put("/experience/:experienceId", updateExperienceController);

// DELETE /api/resume/experience/:experienceId - Delete experience
router.delete("/experience/:experienceId", deleteExperienceController);

// POST /api/resume/experience/reorder - Reorder experiences
router.post("/experience/reorder", reorderExperiencesController);

// ============================================
// RESUME EDUCATION ROUTES
// ============================================

// POST /api/resume/education - Create education
router.post("/education", createEducationController);

// PUT /api/resume/education/:educationId - Update education
router.put("/education/:educationId", updateEducationController);

// DELETE /api/resume/education/:educationId - Delete education
router.delete("/education/:educationId", deleteEducationController);

// ============================================
// RESUME SKILLS ROUTES
// ============================================

// POST /api/resume/skill - Create skill
router.post("/skill", createSkillController);

// PUT /api/resume/skill/:skillId - Update skill
router.put("/skill/:skillId", updateSkillController);

// DELETE /api/resume/skill/:skillId - Delete skill
router.delete("/skill/:skillId", deleteSkillController);

// ============================================
// RESUME PROJECTS ROUTES
// ============================================

// POST /api/resume/project - Create project
router.post("/project", createProjectController);

// PUT /api/resume/project/:projectId - Update project
router.put("/project/:projectId", updateProjectController);

// DELETE /api/resume/project/:projectId - Delete project
router.delete("/project/:projectId", deleteProjectController);

// ============================================
// RESUME CERTIFICATIONS ROUTES
// ============================================

// POST /api/resume/certification - Create certification
router.post("/certification", createCertificationController);

// PUT /api/resume/certification/:certificationId - Update certification
router.put("/certification/:certificationId", updateCertificationController);

// DELETE /api/resume/certification/:certificationId - Delete certification
router.delete("/certification/:certificationId", deleteCertificationController);

// ============================================
// LEGACY ROUTES
// ============================================

router.post("/upload", resumeUpload.single("resume"), uploadResumeController);
router.post("/ats", atsScoreCalculateController);

router.get("/preview", authMiddleware, getResumePreviewController)

export default router;