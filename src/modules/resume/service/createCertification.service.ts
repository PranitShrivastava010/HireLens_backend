import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeCertification } from "@prisma/client";
import { ResumeCertificationInput } from "../validators/resume.validator";

export const createCertificationService = async (
  userId: string,
  data: ResumeCertificationInput
): Promise<ResumeCertification> => {
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

      // Create certification
      const certification = await tx.resumeCertification.create({
        data: {
          resumeId: resume.id,
          name: data.name,
          issuer: data.issuer,
          year: data.year,
          link: data.link,
        },
      });

      return certification;
    }
  );
};
