import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeExperience } from "@prisma/client";
import { ResumeExperienceInput } from "../validators/resume.validator";

export const updateExperienceService = async (
  userId: string,
  experienceId: string,
  data: Partial<ResumeExperienceInput>
): Promise<ResumeExperience> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Verify ownership
      const experience = await tx.resumeExperience.findFirst({
        where: {
          id: experienceId,
          resume: { userId },
        },
      });

      if (!experience) {
        throw new Error("Experience not found or unauthorized");
      }

      // Update experience
      const updated = await tx.resumeExperience.update({
        where: { id: experienceId },
        data,
      });

      return updated;
    }
  );
};
