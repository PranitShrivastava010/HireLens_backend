import { prisma } from "../../../lib/prisma";

interface ApplyJobInput {
    userId: string;
    jobId: string;
    statusKey: string;
    interviewDate?: Date;
}

export const applyJobService = async ({
    userId,
    jobId,
    statusKey,
    interviewDate
}: ApplyJobInput) => {

    const status = await prisma.applicationStatus.findUnique({
        where: { key: statusKey },
    })

    if (!status) {
        throw new Error("Invalid application status")
    }

    if (status.allowsDate && !interviewDate) {
        throw new Error("Interview date is required for this status");
    }

    if (status.allowsDate && !interviewDate) {
        throw new Error("Interview date is required for this status");
    }

    const application = await prisma.jobApplication.upsert({
        where: {
            userId_jobId: {
                userId,
                jobId,
            },
        },
        update: {
            statusId: status.id,
            interviewDate: interviewDate ?? null,
        },
        create: {
            userId,
            jobId,
            statusId: status.id,
            interviewDate: interviewDate ?? null,
        },
    });

    return application;
}