import { z } from "zod";

export const EmailOutreachSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    initialMessage: z.string().min(1, "Initial message is required"),
    followUpMessage: z.string().optional().nullable(),
    resumeLink: z.string().optional().nullable(),
    emails: z.array(z.string().email("Invalid email address")).min(1, "At least one email is required")
})

export type EmailOutreachType = z.infer<typeof EmailOutreachSchema>