import { z } from "zod";

export const jobPreferenceSchema = z.object({
  roleSlugs: z.array(z.string()).min(1, "Select at least one role preference"),
  skillSlugs: z.array(z.string()).min(1, "Select at least one skill preference"),
});

export const fetchJobsSchema = z.object({
  query: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export type JobPreferenceInput = z.infer<typeof jobPreferenceSchema>;
export type FetchJobsInput = z.infer<typeof fetchJobsSchema>;
