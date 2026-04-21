import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeExperience } from "@prisma/client";
import { ResumeExperienceInput } from "../validators/resume.validator";

export const createExperienceService = async (
  userId: string,
  data: ResumeExperienceInput
): Promise<ResumeExperience> => {
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

      // Get max orderIndex
      const lastExperience = await tx.resumeExperience.findFirst({
        where: { resumeId: resume.id },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });

      const orderIndex = (lastExperience?.orderIndex ?? -1) + 1;

      // Create experience
      const experience = await tx.resumeExperience.create({
        data: {
          resumeId: resume.id,
          company: data.company,
          role: data.role,
          location: data.location,
          startDate: data.startDate,
          endDate: data.isCurrent ? null : data.endDate,
          isCurrent: data.isCurrent,
          bullets: data.bullets,
          orderIndex,
        },
      });

      return experience;
    }
  );
};
