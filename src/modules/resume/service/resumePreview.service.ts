import { prisma } from "../../../lib/prisma";
import { mapResumeToPreviewDTO } from "../../../utils/resumePreviewDTO";

export const getResumePreviewService = async (userId: string) => {
  const resume = await prisma.buildResume.findUnique({
    where: { userId },
    include: {
      basics: true,
      experiences: true,
      educations: true,
      projects: true,
      skills: true,
      certifications: true,
    },
  });

  if (!resume) {
    throw new Error("Resume not found");
  }

  // 🔥 THIS is where DTO is used
  return mapResumeToPreviewDTO(resume);
};
