import { prisma } from "../../../lib/prisma";
import { extractCandidateTerms } from "../../../utils/extractCandidateTerms";
import { extractKeywordsWithGroq } from "../../../utils/extractKeywordsWithGroq";

export const fetchJobKeywordsService = async (jobId: string) => {
  const job = await prisma.jobs.findUnique({
    where: { id: jobId },
  });

  if (!job || !job.description) {
    throw new Error("Job not found or description missing");
  }

  const existing = await prisma.jobKeyword.findFirst({
    where: { jobId },
  });

  if (existing) {
    const count = await prisma.jobKeyword.count({ where: { jobId } });
    if (count > 0) return;
  }

  const candidateTerms = extractCandidateTerms(job.description);

  console.log("Candidate terms:", candidateTerms);

  if (!candidateTerms.length) return;

  const finalKeywords = await extractKeywordsWithGroq({
    jobTitle: job.title,
    jobDescription: job.description,
    candidateTerms,
  });

  console.log("Final keywords from Groq:", finalKeywords);

  if (!finalKeywords.length) return;

  await prisma.jobKeyword.createMany({
    data: finalKeywords.map((k) => ({
      jobId,
      keyword: k.keyword,
      score: k.score,
    })),
  });
};
