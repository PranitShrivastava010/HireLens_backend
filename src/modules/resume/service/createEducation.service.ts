import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeEducation } from "@prisma/client";
import { ResumeEducationInput } from "../validators/resume.validator";

export const createEducationService = async (
  userId: string,
  data: ResumeEducationInput
): Promise<ResumeEducation> => {
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

      // Create education
      const education = await tx.resumeEducation.create({
        data: {
          resumeId: resume.id,
          institute: data.institute,
          degree: data.degree,
          field: data.field,
          startYear: data.startYear,
          endYear: data.endYear,
        },
      });

      return education;
    }
  );
};
