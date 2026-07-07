import { z } from "zod";

const nullableString = z.string().trim().min(1).optional().nullable();

const targetCompanyInputSchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  domain: nullableString,
  companyWebsite: nullableString,
  companyLogo: nullableString,
  industry: nullableString,
  size: nullableString,
  careersPageUrl: nullableString,
});

export const addTargetCompaniesSchema = z.object({
  companies: z
    .array(z.union([z.string().trim().min(1), targetCompanyInputSchema]))
    .min(1, "At least one company is required"),
});

export const autoDetectCompaniesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
}).default({});

export const createDiscoveryQueueSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  targetCompanyIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  includeRecruiters: z.boolean().optional(),
  includeHiringManagers: z.boolean().optional(),
  includeEngineers: z.boolean().optional(),
}).default({});

export const captureDiscoveryTaskSchema = z.object({
  contacts: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Contact name is required"),
        role: nullableString,
        company: nullableString,
        linkedinUrl: z.string().trim().url().optional().nullable(),
        profileUrl: z.string().trim().url().optional().nullable(),
      })
    )
    .min(1, "At least one contact is required")
    .max(10, "Capture at most 10 visible contacts per task"),
});

export type TargetCompanyInput = z.infer<typeof targetCompanyInputSchema>;
