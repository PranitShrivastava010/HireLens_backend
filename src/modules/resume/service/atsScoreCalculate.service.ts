import { prisma } from "../../../lib/prisma";
import { hardMatchKeywords } from "../../../utils/hardMatchKeyword";
import { matchResumeWithJobGroq } from "../../../utils/extractAtsScoreWithGroq";
import type { JobKeyword as PrismaJobKeyword } from "@prisma/client";

type JobKeyword = {
  keyword: string;
  type: "ATOMIC" | "CATEGORY" | "CONCEPT";
  aliases?: string[];
  score: number;
};


export const atsScoreCalculateService = async ({
  userId,
  jobId,
  resumeId,
}: {
  userId: string;
  jobId: string;
  resumeId: string;
}) => {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume?.extractedText) {
    throw new Error("Resume text missing");
  }

  const jobKeywordsFromDB: PrismaJobKeyword[] =
    await prisma.jobKeyword.findMany({
      where: { jobId },
    });


  const jobKeywords: JobKeyword[] = jobKeywordsFromDB.map(k => ({
    keyword: k.keyword,
    score: k.score,
    type: k.type ?? "ATOMIC",
    aliases: k.aliases ?? [],
  }));

  const { matched, missing } = hardMatchKeywords(
    jobKeywords,
    resume.extractedText
  );

  const aiResult = await matchResumeWithJobGroq({
    matched,
    missing,
    resumeText: resume.extractedText,
  });

  return prisma.atsAnalysis.create({
    data: {
      userId,
      jobId,
      resumeId,
      score: Math.round(aiResult.score * 100),
      matchedCount: aiResult.finalMatched.length,
      missingCount: aiResult.finalMissing.length,
      matchedKeywords: aiResult.finalMatched,
      missingKeywords: aiResult.finalMissing,
    },
  });
};
