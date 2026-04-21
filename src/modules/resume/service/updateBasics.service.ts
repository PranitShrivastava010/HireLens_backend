import { prisma } from "../../../lib/prisma";
import { Prisma, ResumeBasics } from "@prisma/client";
import { ResumeBasicsInput } from "../validators/resume.validator";

export const updateBasicsService = async (
  userId: string,
  data: Partial<ResumeBasicsInput>
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

      // Upsert basics
      const basics = await tx.resumeBasics.upsert({
        where: { resumeId: resume.id },
        update: data,
        create: {
          resumeId: resume.id,
          fullName: data.fullName || "",
          headline: data.headline,
          summary: data.summary,
          email: data.email,
          phone: data.phone,
          location: data.location,
          linkedin: data.linkedin,
          github: data.github,
        },
      });

      return basics;
    }
  );
};
