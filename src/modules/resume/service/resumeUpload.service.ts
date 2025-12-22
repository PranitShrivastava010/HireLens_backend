import { prisma } from "../../../lib/prisma";

export const uploadResumeService = async (
  userId: string,
  filePath: string
) => {
  return prisma.resume.create({
    data: {
      userId,
      filePath,
    },
  });
};