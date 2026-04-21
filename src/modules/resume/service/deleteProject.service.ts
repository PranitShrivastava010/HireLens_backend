import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const deleteProjectService = async (
  userId: string,
  projectId: string
): Promise<{ id: string }> => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Verify ownership
      const project = await tx.resumeProject.findFirst({
        where: {
          id: projectId,
          resume: { userId },
        },
      });

      if (!project) {
        throw new Error("Project not found or unauthorized");
      }

      // Delete project
      await tx.resumeProject.delete({
        where: { id: projectId },
      });

      return { id: projectId };
    }
  );
};
