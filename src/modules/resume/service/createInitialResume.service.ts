import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

type InitResumeInput = {
  title?: string;
  basics: {
    fullName: string;
    headline?: string;
    summary?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
};

export const createInitialResumeService = async (
  userId: string,
  data: InitResumeInput
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

      return resume;
    }
  );
};
