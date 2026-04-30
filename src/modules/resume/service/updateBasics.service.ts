import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeBasics } from "@prisma/client";
import { UpdateResumeBasicsInput } from "../validators/resume.validator";

export const updateBasicsService = async (
  userId: string,
  data: UpdateResumeBasicsInput
): Promise<ResumeBasics> => {
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

      const { customLinks, ...basicsData } = data;

      // Upsert basics
      const basics = await tx.resumeBasics.upsert({
        where: { resumeId: resume.id },
        update: basicsData,
        create: {
          resumeId: resume.id,
          fullName: basicsData.fullName || "",
          headline: basicsData.headline,
          summary: basicsData.summary,
          email: basicsData.email,
          phone: basicsData.phone,
          location: basicsData.location,
          linkedin: basicsData.linkedin,
          github: basicsData.github,
        },
      });

      if (customLinks) {
        await tx.resumeContactLink.deleteMany({
          where: { resumeId: resume.id },
        });

        if (customLinks.length) {
          await tx.resumeContactLink.createMany({
            data: customLinks.map((link, index) => ({
              resumeId: resume.id,
              label: link.label,
              url: link.url,
              orderIndex: index,
            })),
          });
        }
      }

      return basics;
    }
  );
};
