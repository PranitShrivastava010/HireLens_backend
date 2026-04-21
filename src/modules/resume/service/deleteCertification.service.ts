import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const deleteCertificationService = async (
  userId: string,
  certificationId: string
): Promise<{ id: string }> => {
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

      // Delete certification
      await tx.resumeCertification.delete({
        where: { id: certificationId },
      });

      return { id: certificationId };
    }
  );
};
