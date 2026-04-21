import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeSkill } from "@prisma/client";
import { ResumeSkillInput } from "../validators/resume.validator";

export const createSkillService = async (
  userId: string,
  data: ResumeSkillInput
): Promise<ResumeSkill> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Find user's resume
      const resume = await tx.buildResume.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!resume) {
        throw new Error("Resume not found");
      }

      // Create skill
      const skill = await tx.resumeSkill.create({
        data: {
          resumeId: resume.id,
          name: data.name,
          level: data.level,
          category: data.category,
        },
      });

      return skill;
    }
  );
};
