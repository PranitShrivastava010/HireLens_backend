import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const reorderExperiencesService = async (
  userId: string,
  experienceIds: string[]
): Promise<{ success: boolean }> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Verify all experiences belong to user
      const experiences = await tx.resumeExperience.findMany({
        where: {
          id: { in: experienceIds },
          resume: { userId },
        },
        select: { id: true },
      });

      if (experiences.length !== experienceIds.length) {
        throw new Error("One or more experiences not found or unauthorized");
      }

      // Update all orderIndexes
      await Promise.all(
        experienceIds.map((id, index) =>
          tx.resumeExperience.update({
            where: { id },
            data: { orderIndex: index },
          })
        )
      );

      return { success: true };
    }
  );
};
