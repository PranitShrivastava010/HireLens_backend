import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeCertification } from "@prisma/client";
import { ResumeCertificationInput } from "../validators/resume.validator";

export const updateCertificationService = async (
  userId: string,
  certificationId: string,
  data: Partial<ResumeCertificationInput>
): Promise<ResumeCertification> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Verify ownership
      const certification = await tx.resumeCertification.findFirst({
        where: {
          id: certificationId,
          resume: { userId },
        },
      });

      if (!certification) {
        throw new Error("Certification not found or unauthorized");
      }

      // Update certification
      const updated = await tx.resumeCertification.update({
        where: { id: certificationId },
        data,
      });

      return updated;
    }
  );
};
