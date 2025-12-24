import { prisma } from "../../../lib/prisma";
import { extractPdfText } from "../../../utils/extractPdfText";

export const uploadResumeService = async (
  userId: string,
  filePath: string,
  fileBuffer: Buffer
) => {
  const extractedText = await extractPdfText(fileBuffer);

  // Prisma writes directly to Neon DB
  const resume = await prisma.resume.create({
    data: {
      userId,
      filePath,
      extractedText,
    },
  });

  return resume;
};