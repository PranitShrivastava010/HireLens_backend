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
          contactLinks: {
            orderBy: { orderIndex: "asc" },
          },
          layoutSettings: true,
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
        customLinks: resume.contactLinks?.map((link) => ({
          id: link.id,
          label: link.label,
          url: link.url,
          orderIndex: link.orderIndex,
        })) ?? [],
        layoutSettings: resume.layoutSettings
          ? {
              pageMode: resume.layoutSettings.pageMode,
              density: resume.layoutSettings.density,
              fontSize: resume.layoutSettings.fontSize,
              lineHeight: resume.layoutSettings.lineHeight,
              pagePaddingTop: resume.layoutSettings.pagePaddingTop,
              pagePaddingBottom: resume.layoutSettings.pagePaddingBottom,
              pagePaddingX: resume.layoutSettings.pagePaddingX,
              sectionSpacing: resume.layoutSettings.sectionSpacing,
              itemSpacing: resume.layoutSettings.itemSpacing,
              bulletSpacing: resume.layoutSettings.bulletSpacing,
            }
          : null,
        sectionVisibility: resume.layoutSettings
          ? {
              summary: resume.layoutSettings.showSummary,
              experience: resume.layoutSettings.showExperience,
              projects: resume.layoutSettings.showProjects,
              skills: resume.layoutSettings.showSkills,
              education: resume.layoutSettings.showEducation,
              certifications: resume.layoutSettings.showCertifications,
            }
          : null,
        experiences: resume.experiences ?? [],
        educations: resume.educations ?? [],
        projects: resume.projects ?? [],
        skills: resume.skills ?? [],
        certifications: resume.certifications ?? [],
      };
    }
  );
};
