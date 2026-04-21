import { z } from "zod";

export const applyJobSchema = z.object({
  jobId: z.string().uuid("Invalid Job ID format"),
  statusKey: z.string().min(1, "Status key is required"),
  interviewDate: z.string().datetime().optional().or(z.string().length(0)).or(z.null()),
});

export const updateApplicationStatusSchema = z.object({
  applicationId: z.string().uuid("Invalid Application ID format"),
  newStatusKey: z.string().min(1, "Status key is required"),
  interviewDate: z.string().datetime().optional().or(z.string().length(0)).or(z.null()),
});

export type ApplyJobInput = z.infer<typeof applyJobSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
