import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const deleteEducationService = async (
  userId: string,
  educationId: string
): Promise<{ id: string }> => {
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

      // Delete education
      await tx.resumeEducation.delete({
        where: { id: educationId },
      });

      return { id: educationId };
    }
  );
};
