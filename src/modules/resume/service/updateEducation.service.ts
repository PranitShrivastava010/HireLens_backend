import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeEducation } from "@prisma/client";
import { ResumeEducationInput } from "../validators/resume.validator";

export const updateEducationService = async (
  userId: string,
  educationId: string,
  data: Partial<ResumeEducationInput>
): Promise<ResumeEducation> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Verify ownership
      const education = await tx.resumeEducation.findFirst({
        where: {
          id: educationId,
          resume: { userId },
        },
      });

      if (!education) {
        throw new Error("Education not found or unauthorized");
      }

      // Update education
      const updated = await tx.resumeEducation.update({
        where: { id: educationId },
        data,
      });

      return updated;
    }
  );
};
