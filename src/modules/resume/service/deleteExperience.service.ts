import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const deleteExperienceService = async (
  userId: string,
  experienceId: string
): Promise<{ id: string }> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Verify ownership
      const experience = await tx.resumeExperience.findFirst({
        where: {
          id: experienceId,
          resume: { userId },
        },
        select: { id: true, orderIndex: true, resumeId: true },
      });

      if (!experience) {
        throw new Error("Experience not found or unauthorized");
      }

      // Delete experience
      await tx.resumeExperience.delete({
        where: { id: experienceId },
      });

      // Reorder remaining experiences
      const remainingExperiences = await tx.resumeExperience.findMany({
        where: { resumeId: experience.resumeId },
        orderBy: { orderIndex: "asc" },
        select: { id: true },
      });

      for (let i = 0; i < remainingExperiences.length; i++) {
        await tx.resumeExperience.update({
          where: { id: remainingExperiences[i].id },
          data: { orderIndex: i },
        });
      }

      return { id: experienceId };
    }
  );
};
