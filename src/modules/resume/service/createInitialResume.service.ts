import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { CreateResumeInput } from "../validators/resume.validator";

export const createInitialResumeService = async (
  userId: string,
  data: CreateResumeInput
) => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {

      const existing = await tx.buildResume.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (existing) {
        throw new Error("Resume already exists");
      }

      const resume = await tx.buildResume.create({
        data: {
          userId,
          title: data.title ?? "Untitled Resume",
        },
      });

      await tx.resumeBasics.create({
        data: {
          resumeId: resume.id,
          ...data.basics,
        },
      });

      if (data.customLinks?.length) {
        await tx.resumeContactLink.createMany({
          data: data.customLinks.map((link, index) => ({
            resumeId: resume.id,
            label: link.label,
            url: link.url,
            orderIndex: index,
          })),
        });
      }

      if (data.layoutSettings) {
        const { sectionVisibility, ...layoutValues } = data.layoutSettings;

        await tx.resumeLayoutSettings.create({
          data: {
            resumeId: resume.id,
            ...layoutValues,
            showSummary: sectionVisibility?.summary ?? true,
            showExperience: sectionVisibility?.experience ?? true,
            showProjects: sectionVisibility?.projects ?? true,
            showSkills: sectionVisibility?.skills ?? true,
            showEducation: sectionVisibility?.education ?? true,
            showCertifications: sectionVisibility?.certifications ?? true,
          },
        });
      }

      return resume;
    }
  );
};
