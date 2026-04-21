import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const getResumeService = async (userId: string) => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const resume = await tx.buildResume.findUnique({
        where: { userId },
        select: {
          id: true,
          userId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          basics: true,
          experiences: {
            orderBy: { orderIndex: "asc" },
          },
          educations: { orderBy: { startYear: "desc" } },
          projects: { orderBy: { id: "asc" } },
          skills: { orderBy: { name: "asc" } },
          certifications: { orderBy: { year: "desc" } },
        },
      });

      if (!resume) {
        throw new Error("Resume not found");
      }

      return {
        ...resume,
        basics: resume.basics ?? null,
        experiences: resume.experiences ?? [],
        educations: resume.educations ?? [],
        projects: resume.projects ?? [],
        skills: resume.skills ?? [],
        certifications: resume.certifications ?? [],
      };
    }
  );
};
