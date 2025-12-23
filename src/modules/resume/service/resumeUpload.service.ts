import { prisma } from "../../../lib/prisma";
import { extractPdfText } from "../../../utils/extractPdfText";

export const uploadResumeService = async (
  userId: string,
  filePath: string
) => {
  // 1️⃣ Extract text
  const extractedText = await extractPdfText(filePath);

  // 2️⃣ Save resume + text
  const resume = await prisma.resume.create({
    data: {
      userId,
      filePath,
      extractedText,
    },
  });

  return resume;
};