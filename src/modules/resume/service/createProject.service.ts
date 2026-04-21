import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeProject } from "@prisma/client";
import { ResumeProjectInput } from "../validators/resume.validator";

export const createProjectService = async (
  userId: string,
  data: ResumeProjectInput
): Promise<ResumeProject> => {
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

      // Create project
      const project = await tx.resumeProject.create({
        data: {
          resumeId: resume.id,
          name: data.name,
          description: data.description,
          techStack: data.techStack,
          link: data.link,
        },
      });

      return project;
    }
  );
};
