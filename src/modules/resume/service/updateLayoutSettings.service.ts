import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { ResumeLayoutSettingsInput } from "../validators/resume.validator";

const mapVisibilityForCreate = (
  visibility?: ResumeLayoutSettingsInput["sectionVisibility"]
) => ({
  showSummary: visibility?.summary ?? true,
  showExperience: visibility?.experience ?? true,
  showProjects: visibility?.projects ?? true,
  showSkills: visibility?.skills ?? true,
  showEducation: visibility?.education ?? true,
  showCertifications: visibility?.certifications ?? true,
});

const mapVisibilityForUpdate = (
  visibility?: ResumeLayoutSettingsInput["sectionVisibility"]
) => ({
  showSummary: visibility?.summary,
  showExperience: visibility?.experience,
  showProjects: visibility?.projects,
  showSkills: visibility?.skills,
  showEducation: visibility?.education,
  showCertifications: visibility?.certifications,
});

export const updateLayoutSettingsService = async (
  userId: string,
  data: ResumeLayoutSettingsInput
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const resume = await tx.buildResume.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!resume) {
      throw new Error("Resume not found");
    }

    const { sectionVisibility, ...layoutValues } = data;

    return tx.resumeLayoutSettings.upsert({
      where: { resumeId: resume.id },
      update: {
        ...layoutValues,
        ...mapVisibilityForUpdate(sectionVisibility),
      },
      create: {
        resumeId: resume.id,
        ...layoutValues,
        ...mapVisibilityForCreate(sectionVisibility),
      },
    });
  });
};
