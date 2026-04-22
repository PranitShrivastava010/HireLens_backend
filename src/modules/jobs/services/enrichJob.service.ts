import { JobEnrichmentStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { extractRolesAndSkillsForJob } from "./roleSkill.service";

export const enrichJobById = async (jobId: string) => {
  await prisma.jobs.update({
    where: { id: jobId },
    data: {
      enrichmentStatus: JobEnrichmentStatus.PROCESSING,
      enrichmentStartedAt: new Date(),
      enrichmentAttempts: {
        increment: 1,
      },
      enrichmentLastError: null,
    },
  });

  try {
    const result = await extractRolesAndSkillsForJob(jobId);

    await prisma.jobs.update({
      where: { id: jobId },
      data: {
        enrichmentStatus: JobEnrichmentStatus.COMPLETED,
        enrichedAt: new Date(),
        enrichmentLastError: null,
      },
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to enrich job";

    await prisma.jobs.update({
      where: { id: jobId },
      data: {
        enrichmentStatus: JobEnrichmentStatus.FAILED,
        enrichmentLastError: errorMessage,
      },
    });

    throw error;
  }
};
