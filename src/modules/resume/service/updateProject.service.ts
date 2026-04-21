import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeProject } from "@prisma/client";
import { ResumeProjectInput } from "../validators/resume.validator";

export const updateProjectService = async (
  userId: string,
  projectId: string,
  data: Partial<ResumeProjectInput>
): Promise<ResumeProject> => {
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

      // Update project
      const updated = await tx.resumeProject.update({
        where: { id: projectId },
        data,
      });

      return updated;
    }
  );
};
