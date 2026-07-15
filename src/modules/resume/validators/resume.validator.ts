import { z } from "zod";

const nullableTrimmedString = () => z.string().trim().min(1).nullable().optional();
const nullableUrlString = () => z.string().url("Invalid URL").nullable().optional();

export const resumeContactLinkSchema = z.object({
  label: z.string().trim().min(1, "Link label is required"),
  url: z.string().url("Invalid link URL"),
});

export const resumeSectionVisibilitySchema = z.object({
  summary: z.boolean().optional(),
  experience: z.boolean().optional(),
  projects: z.boolean().optional(),
  skills: z.boolean().optional(),
  education: z.boolean().optional(),
  certifications: z.boolean().optional(),
});

export const resumeLayoutSettingsSchema = z.object({
  pageMode: z.string().trim().min(1).optional(),
  density: z.string().trim().min(1).optional(),
  fontSize: z.number().min(8).max(14).optional(),
  lineHeight: z.number().min(0.8).max(2).optional(),
  pagePaddingTop: z.number().min(0).max(2).optional(),
  pagePaddingBottom: z.number().min(0).max(2).optional(),
  pagePaddingX: z.number().min(0).max(2).optional(),
  sectionSpacing: z.number().int().min(0).max(30).optional(),
  itemSpacing: z.number().int().min(0).max(30).optional(),
  bulletSpacing: z.number().int().min(0).max(30).optional(),
  sectionVisibility: resumeSectionVisibilitySchema.optional(),
});

/**
 * Resume Basics (maps to ResumeBasics table)
 */
export const resumeBasicsSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters"),

  headline: nullableTrimmedString(),
  summary: nullableTrimmedString(),

  email: z.string().email("Invalid email").nullable().optional(),
  phone: nullableTrimmedString(),
  location: nullableTrimmedString(),

  linkedin: z
    .string()
    .url("Invalid LinkedIn URL")
    .nullable()
    .optional(),

  github: z
    .string()
    .url("Invalid GitHub URL")
    .nullable()
    .optional(),
});

export const updateResumeBasicsSchema = resumeBasicsSchema.partial().extend({
  customLinks: z.array(resumeContactLinkSchema).optional(),
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
  customLinks: z.array(resumeContactLinkSchema).optional(),
  layoutSettings: resumeLayoutSettingsSchema.optional(),
});

/**
 * Resume Experience Schema
 */
export const resumeExperienceBaseSchema = z.object({
  company: z
    .string()
    .min(1, "Company name is required"),

  role: z
    .string()
    .min(1, "Role is required"),

  location: nullableTrimmedString(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  isCurrent: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});

export const resumeExperienceSchema = resumeExperienceBaseSchema.refine(
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

export const updateResumeExperienceSchema = resumeExperienceBaseSchema.partial();

/**
 * Resume Education Schema
 */
export const resumeEducationBaseSchema = z.object({
  institute: z
    .string()
    .min(1, "Institute name is required"),

  degree: z
    .string()
    .min(1, "Degree is required"),

  field: nullableTrimmedString(),
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
    .nullable()
    .optional(),
});

export const resumeEducationSchema = resumeEducationBaseSchema.refine(
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

export const updateResumeEducationSchema = resumeEducationBaseSchema.partial();

/**
 * Resume Skill Schema
 */
export const resumeSkillSchema = z.object({
  name: z
    .string()
    .min(1, "Skill name is required"),

  level: z
    .enum(["Beginner", "Intermediate", "Expert"])
    .nullable()
    .optional(),

  category: nullableTrimmedString(),
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
  link: nullableUrlString(),
  dateLabel: nullableTrimmedString(),
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
    .nullable()
    .optional(),

  link: nullableUrlString(),
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
export type UpdateResumeBasicsInput = z.infer<typeof updateResumeBasicsSchema>;
export type ResumeExperienceInput = z.infer<typeof resumeExperienceSchema>;
export type ResumeEducationInput = z.infer<typeof resumeEducationSchema>;
export type ResumeSkillInput = z.infer<typeof resumeSkillSchema>;
export type ResumeProjectInput = z.infer<typeof resumeProjectSchema>;
export type ResumeCertificationInput = z.infer<typeof resumeCertificationSchema>;
export type UpdateResumeTitleInput = z.infer<typeof updateResumeTitleSchema>;
export type ResumeContactLinkInput = z.infer<typeof resumeContactLinkSchema>;
export type ResumeLayoutSettingsInput = z.infer<typeof resumeLayoutSettingsSchema>;
