import { Request, Response } from "express";
import { uploadResumeService } from "./service/resumeUpload.service";
import { atsScoreCalculateService } from "./service/atsScoreCalculate.service";
import { uploadToSupabase } from "../../config/multer";
import { createInitialResumeService } from "./service/createInitialResume.service";
import { getResumeService } from "./service/getResume.service";
import { updateResumeTitleService } from "./service/updateResumeTitle.service";
import { updateBasicsService } from "./service/updateBasics.service";
import { createExperienceService } from "./service/createExperience.service";
import { updateExperienceService } from "./service/updateExperience.service";
import { deleteExperienceService } from "./service/deleteExperience.service";
import { reorderExperiencesService } from "./service/reorderExperiences.service";
import { createEducationService } from "./service/createEducation.service";
import { updateEducationService } from "./service/updateEducation.service";
import { deleteEducationService } from "./service/deleteEducation.service";
import { createSkillService } from "./service/createSkill.service";
import { updateSkillService } from "./service/updateSkill.service";
import { deleteSkillService } from "./service/deleteSkill.service";
import { createProjectService } from "./service/createProject.service";
import { updateProjectService } from "./service/updateProject.service";
import { deleteProjectService } from "./service/deleteProject.service";
import { createCertificationService } from "./service/createCertification.service";
import { updateCertificationService } from "./service/updateCertification.service";
import { deleteCertificationService } from "./service/deleteCertification.service";
import {
  createResumeSchema,
  updateResumeBasicsSchema,
  resumeExperienceSchema,
  resumeEducationSchema,
  resumeSkillSchema,
  resumeProjectSchema,
  resumeCertificationSchema,
  resumeLayoutSettingsSchema,
  updateResumeTitleSchema,
  updateResumeExperienceSchema,
  updateResumeEducationSchema,
} from "./validators/resume.validator";
import { getResumePreviewService } from "./service/resumePreview.service";
import { updateLayoutSettingsService } from "./service/updateLayoutSettings.service";

export const uploadResumeController = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    const userId = req.user!.userId; // make sure authMiddleware sets this

    console.log("STEP 1: before Supabase upload");
    const filePath = await uploadToSupabase(req.file);
    console.log("STEP 1: after Supabase upload", filePath);

    console.log("STEP 2: before Prisma insert");
    const resume = await uploadResumeService(userId, filePath, req.file.buffer);
    console.log("STEP 2: after Prisma insert", resume.id);

    return res.status(201).json({
      success: true,
      message: "Resume uploaded & processed successfully",
      resumeId: resume.id,
    });
  } catch (error: any) {
    console.error("Upload Resume Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      meta: error.meta
    });
  }
};


export const atsScoreCalculateController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { jobId, resumeId } = req.body;

    const data = await atsScoreCalculateService({
      userId,
      jobId,
      resumeId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const createInitialResumeController = async (
  req: Request,
  res: Response
) => {
  try {
    // ✅ 1. Validate request body
    const parsed = createResumeSchema.parse(req.body);

    const userId = req.user!.userId;

    // ✅ 3. Call service
    const resume = await createInitialResumeService(userId, parsed);

    return res.status(201).json({
      success: true,
      message: "Resume created successfully",
      resumeId: resume.id,
    });
  } catch (error: any) {
    console.error("Create resume error:", error);

    // Zod validation error
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create resume",
    });
  }
};

// ============================================
// GET RESUME
// ============================================

export const getResumeController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const resume = await getResumeService(userId);

    return res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error: any) {
    console.error("Get resume error:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "Resume not found",
    });
  }
};

// ============================================
// UPDATE RESUME TITLE
// ============================================

export const updateResumeTitleController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    // Validate input
    const parsed = updateResumeTitleSchema.parse(req.body);

    const resume = await updateResumeTitleService(userId, parsed);

    return res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error: any) {
    console.error("Update resume title error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update resume title",
    });
  }
};

// ============================================
// RESUME BASICS
// ============================================

export const updateBasicsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Validate input
    const parsed = updateResumeBasicsSchema.parse(req.body);

    const basics = await updateBasicsService(userId, parsed);

    return res.status(200).json({
      success: true,
      data: basics,
    });
  } catch (error: any) {
    console.error("Update basics error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update basics",
    });
  }
};

// ============================================
// RESUME EXPERIENCE
// ============================================

export const createExperienceController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    // Validate input
    const parsed = resumeExperienceSchema.parse(req.body);

    const experience = await createExperienceService(userId, parsed);

    return res.status(201).json({
      success: true,
      data: experience,
    });
  } catch (error: any) {
    console.error("Create experience error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create experience",
    });
  }
};

export const updateExperienceController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { experienceId } = req.params;

    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: "Experience ID is required",
      });
    }

    // Validate input
    const parsed = updateResumeExperienceSchema.parse(req.body);

    const experience = await updateExperienceService(userId, experienceId, parsed);

    return res.status(200).json({
      success: true,
      data: experience,
    });
  } catch (error: any) {
    console.error("Update experience error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update experience",
    });
  }
};

export const deleteExperienceController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { experienceId } = req.params;

    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: "Experience ID is required",
      });
    }

    await deleteExperienceService(userId, experienceId);

    return res.status(200).json({
      success: true,
      message: "Experience deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete experience error:", error);

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete experience",
    });
  }
};

export const reorderExperiencesController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { experienceIds } = req.body;

    if (!Array.isArray(experienceIds) || experienceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Experience IDs must be a non-empty array",
      });
    }

    await reorderExperiencesService(userId, experienceIds);

    return res.status(200).json({
      success: true,
      message: "Experiences reordered successfully",
    });
  } catch (error: any) {
    console.error("Reorder experiences error:", error);

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reorder experiences",
    });
  }
};

// ============================================
// RESUME EDUCATION
// ============================================

export const createEducationController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    // Validate input
    const parsed = resumeEducationSchema.parse(req.body);

    const education = await createEducationService(userId, parsed);

    return res.status(201).json({
      success: true,
      data: education,
    });
  } catch (error: any) {
    console.error("Create education error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create education",
    });
  }
};

export const updateEducationController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { educationId } = req.params;

    if (!educationId) {
      return res.status(400).json({
        success: false,
        message: "Education ID is required",
      });
    }

    // Validate input
    const parsed = updateResumeEducationSchema.parse(req.body);

    const education = await updateEducationService(userId, educationId, parsed);

    return res.status(200).json({
      success: true,
      data: education,
    });
  } catch (error: any) {
    console.error("Update education error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update education",
    });
  }
};

export const deleteEducationController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { educationId } = req.params;

    if (!educationId) {
      return res.status(400).json({
        success: false,
        message: "Education ID is required",
      });
    }

    await deleteEducationService(userId, educationId);

    return res.status(200).json({
      success: true,
      message: "Education deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete education error:", error);

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete education",
    });
  }
};

// ============================================
// RESUME SKILLS
// ============================================

export const createSkillController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Validate input
    const parsed = resumeSkillSchema.parse(req.body);

    const skill = await createSkillService(userId, parsed);

    return res.status(201).json({
      success: true,
      data: skill,
    });
  } catch (error: any) {
    console.error("Create skill error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create skill",
    });
  }
};

export const updateSkillController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { skillId } = req.params;

    if (!skillId) {
      return res.status(400).json({
        success: false,
        message: "Skill ID is required",
      });
    }

    // Validate input
    const parsed = resumeSkillSchema.partial().parse(req.body);

    const skill = await updateSkillService(userId, skillId, parsed);

    return res.status(200).json({
      success: true,
      data: skill,
    });
  } catch (error: any) {
    console.error("Update skill error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update skill",
    });
  }
};

export const deleteSkillController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { skillId } = req.params;

    if (!skillId) {
      return res.status(400).json({
        success: false,
        message: "Skill ID is required",
      });
    }

    await deleteSkillService(userId, skillId);

    return res.status(200).json({
      success: true,
      message: "Skill deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete skill error:", error);

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete skill",
    });
  }
};

// ============================================
// RESUME PROJECTS
// ============================================

export const createProjectController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Validate input
    const parsed = resumeProjectSchema.parse(req.body);

    const project = await createProjectService(userId, parsed);

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error("Create project error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create project",
    });
  }
};

export const updateProjectController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Validate input
    const parsed = resumeProjectSchema.partial().parse(req.body);

    const project = await updateProjectService(userId, projectId, parsed);

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error("Update project error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update project",
    });
  }
};

export const deleteProjectController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    await deleteProjectService(userId, projectId);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete project error:", error);

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete project",
    });
  }
};

// ============================================
// RESUME CERTIFICATIONS
// ============================================

export const createCertificationController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    // Validate input
    const parsed = resumeCertificationSchema.parse(req.body);

    const certification = await createCertificationService(userId, parsed);

    return res.status(201).json({
      success: true,
      data: certification,
    });
  } catch (error: any) {
    console.error("Create certification error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create certification",
    });
  }
};

export const updateCertificationController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { certificationId } = req.params;

    if (!certificationId) {
      return res.status(400).json({
        success: false,
        message: "Certification ID is required",
      });
    }

    // Validate input
    const parsed = resumeCertificationSchema.partial().parse(req.body);

    const certification = await updateCertificationService(
      userId,
      certificationId,
      parsed
    );

    return res.status(200).json({
      success: true,
      data: certification,
    });
  } catch (error: any) {
    console.error("Update certification error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update certification",
    });
  }
};

export const deleteCertificationController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { certificationId } = req.params;

    if (!certificationId) {
      return res.status(400).json({
        success: false,
        message: "Certification ID is required",
      });
    }

    await deleteCertificationService(userId, certificationId);

    return res.status(200).json({
      success: true,
      message: "Certification deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete certification error:", error);

    if (error.message.includes("unauthorized")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete certification",
    });
  }
};

export const getResumePreviewController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    const preview = await getResumePreviewService(userId);

    return res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateLayoutSettingsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    const parsed = resumeLayoutSettingsSchema.parse(req.body);

    const layoutSettings = await updateLayoutSettingsService(userId, parsed);

    return res.status(200).json({
      success: true,
      data: layoutSettings,
    });
  } catch (error: any) {
    console.error("Update layout settings error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update layout settings",
    });
  }
};
