import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeSkill } from "@prisma/client";
import { ResumeSkillInput } from "../validators/resume.validator";

export const updateSkillService = async (
  userId: string,
  skillId: string,
  data: Partial<ResumeSkillInput>
): Promise<ResumeSkill> => {
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

      // Update skill
      const updated = await tx.resumeSkill.update({
        where: { id: skillId },
        data,
      });

      return updated;
    }
  );
};
