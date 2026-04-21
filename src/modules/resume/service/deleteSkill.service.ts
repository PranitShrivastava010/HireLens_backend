import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const deleteSkillService = async (
  userId: string,
  skillId: string
): Promise<{ id: string }> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Verify ownership
      const skill = await tx.resumeSkill.findFirst({
        where: {
          id: skillId,
          resume: { userId },
        },
      });

      if (!skill) {
        throw new Error("Skill not found or unauthorized");
      }

      // Delete skill
      await tx.resumeSkill.delete({
        where: { id: skillId },
      });

      return { id: skillId };
    }
  );
};
