import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { UpdateResumeTitleInput } from "../validators/resume.validator";

export const updateResumeTitleService = async (
  userId: string,
  data: UpdateResumeTitleInput
) => {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const resume = await tx.buildResume.update({
        where: { userId },
        data: {
          title: data.title,
        },
        select: {
          id: true,
          userId: true,
          title: true,
          updatedAt: true,
        },
      });

      return resume;
    }
  );
};
