import { z } from "zod";

/**
 * Resume Basics (maps to ResumeBasics table)
 */
export const resumeBasicsSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters"),

  headline: z.string().optional(),
  summary: z.string().optional(),

  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  location: z.string().optional(),

  linkedin: z
    .string()
    .url("Invalid LinkedIn URL")
    .optional(),

  github: z
    .string()
    .url("Invalid GitHub URL")
    .optional(),
});

/**
 * Create Resume Schema (Initial resume creation)
 * Only creates:
 * - BuildResume
 * - ResumeBasics
 */
export const createResumeSchema = z.object({
  title: z.string().optional(),

  basics: resumeBasicsSchema,
});

/**
 * Resume Experience Schema
 */
export const resumeExperienceSchema = z.object({
  company: z
    .string()
    .min(1, "Company name is required"),

  role: z
    .string()
    .min(1, "Role is required"),

  location: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
}).refine(
  (data) => {
    if (data.endDate && data.startDate > data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

/**
 * Resume Education Schema
 */
export const resumeEducationSchema = z.object({
  institute: z
    .string()
    .min(1, "Institute name is required"),

  degree: z
    .string()
    .min(1, "Degree is required"),

  field: z.string().optional(),
  startYear: z.coerce
    .number()
    .int()
    .min(1900, "Invalid start year")
    .max(new Date().getFullYear() + 1, "Start year cannot be in future"),

  endYear: z.coerce
    .number()
    .int()
    .min(1900, "Invalid end year")
    .max(new Date().getFullYear() + 1, "End year cannot be in future")
    .optional(),
}).refine(
  (data) => {
    if (data.endYear && data.startYear > data.endYear) {
      return false;
    }
    return true;
  },
  {
    message: "End year must be after start year",
    path: ["endYear"],
  }
);

/**
 * Resume Skill Schema
 */
export const resumeSkillSchema = z.object({
  name: z
    .string()
    .min(1, "Skill name is required"),

  level: z
    .enum(["Beginner", "Intermediate", "Expert"])
    .optional(),

  category: z.string().optional(),
});

/**
 * Resume Project Schema
 */
export const resumeProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required"),

  description: z
    .string()
    .min(1, "Description is required"),

  techStack: z.array(z.string()).default([]),
  link: z.string().url("Invalid project URL").optional(),
});

/**
 * Resume Certification Schema
 */
export const resumeCertificationSchema = z.object({
  name: z
    .string()
    .min(1, "Certification name is required"),

  issuer: z
    .string()
    .min(1, "Issuer is required"),

  year: z.coerce
    .number()
    .int()
    .min(1900, "Invalid year")
    .max(new Date().getFullYear(), "Year cannot be in future")
    .optional(),

  link: z.string().url("Invalid certification URL").optional(),
});

/**
 * Resume Title Update Schema
 */
export const updateResumeTitleSchema = z.object({
  title: z.string().optional(),
});

/**
 * Types
 */
export type CreateResumeInput = z.infer<typeof createResumeSchema>;
export type ResumeBasicsInput = z.infer<typeof resumeBasicsSchema>;
export type ResumeExperienceInput = z.infer<typeof resumeExperienceSchema>;
export type ResumeEducationInput = z.infer<typeof resumeEducationSchema>;
export type ResumeSkillInput = z.infer<typeof resumeSkillSchema>;
export type ResumeProjectInput = z.infer<typeof resumeProjectSchema>;
export type ResumeCertificationInput = z.infer<typeof resumeCertificationSchema>;
export type UpdateResumeTitleInput = z.infer<typeof updateResumeTitleSchema>;
