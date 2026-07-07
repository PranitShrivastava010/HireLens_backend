import { outreachDb } from "../outreach.prisma";
import {
  OutreachContactType,
  OutreachDiscoveryQueueStatus,
  OutreachDiscoveryTaskStatus,
  OutreachEmailStatus,
  OutreachProvider,
} from "../outreach.types";
import { saveDiscoveredContactService } from "../contacts/dedup.service";
import { DiscoveredContact } from "../contacts/contact.types";

type CreateDiscoveryQueueInput = {
  userId: string;
  name?: string;
  targetCompanyIds?: string[];
  includeRecruiters?: boolean;
  includeHiringManagers?: boolean;
  includeEngineers?: boolean;
};

type CapturedLinkedInContact = {
  name: string;
  role?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  profileUrl?: string | null;
};

const SEARCH_SPECS = [
  {
    contactType: OutreachContactType.RECRUITER,
    title: "Recruiter",
    includeKey: "includeRecruiters",
  },
  {
    contactType: OutreachContactType.HIRING_MANAGER,
    title: "Engineering Manager",
    includeKey: "includeHiringManagers",
  },
  {
    contactType: OutreachContactType.ENGINEER,
    title: "Software Engineer",
    includeKey: "includeEngineers",
  },
] as const;

const COMPLETED_TASK_STATUSES = new Set<string>([
  OutreachDiscoveryTaskStatus.CAPTURED,
  OutreachDiscoveryTaskStatus.SKIPPED,
  OutreachDiscoveryTaskStatus.FAILED,
]);

const buildLinkedInPeopleSearchUrl = (query: string) => {
  const params = new URLSearchParams({
    keywords: query,
  });

  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
};

const getEnabledSearchSpecs = (input: CreateDiscoveryQueueInput) => {
  const anyExplicitToggle =
    input.includeRecruiters !== undefined ||
    input.includeHiringManagers !== undefined ||
    input.includeEngineers !== undefined;

  if (!anyExplicitToggle) {
    return SEARCH_SPECS;
  }

  return SEARCH_SPECS.filter((spec) => input[spec.includeKey] !== false);
};

const refreshQueueProgress = async (queueId: string) => {
  const tasks = await outreachDb.outreachDiscoveryTask.findMany({
    where: { queueId },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) =>
    COMPLETED_TASK_STATUSES.has(task.status)
  ).length;
  const isComplete = totalTasks > 0 && completedTasks >= totalTasks;

  return outreachDb.outreachDiscoveryQueue.update({
    where: { id: queueId },
    data: {
      totalTasks,
      completedTasks,
      status: isComplete
        ? OutreachDiscoveryQueueStatus.COMPLETED
        : OutreachDiscoveryQueueStatus.ACTIVE,
      completedAt: isComplete ? new Date() : null,
    },
  });
};

export const createLinkedInDiscoveryQueueService = async (
  input: CreateDiscoveryQueueInput
) => {
  const companies = await outreachDb.targetCompany.findMany({
    where: {
      userId: input.userId,
      ...(input.targetCompanyIds?.length
        ? { id: { in: input.targetCompanyIds } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!companies.length) {
    throw new Error("Add target companies before starting a discovery queue");
  }

  const searchSpecs = getEnabledSearchSpecs(input);

  if (!searchSpecs.length) {
    throw new Error("Select at least one LinkedIn search type");
  }

  const queue = await outreachDb.outreachDiscoveryQueue.create({
    data: {
      userId: input.userId,
      name: input.name ?? `LinkedIn discovery ${new Date().toISOString()}`,
      status: OutreachDiscoveryQueueStatus.PENDING,
      totalTasks: companies.length * searchSpecs.length,
    },
  });

  let orderIndex = 0;
  const taskRows = companies.flatMap((company) =>
    searchSpecs.map((spec) => {
      const searchQuery = `${spec.title} at ${company.name}`;

      return {
        queueId: queue.id,
        userId: input.userId,
        targetCompanyId: company.id,
        contactType: spec.contactType,
        searchTitle: spec.title,
        searchQuery,
        searchUrl: buildLinkedInPeopleSearchUrl(searchQuery),
        orderIndex: orderIndex++,
      };
    })
  );

  await outreachDb.outreachDiscoveryTask.createMany({
    data: taskRows,
  });

  return getLinkedInDiscoveryQueueService(input.userId, queue.id);
};

export const getLinkedInDiscoveryQueueService = async (
  userId: string,
  queueId: string
) => {
  const queue = await outreachDb.outreachDiscoveryQueue.findFirst({
    where: {
      id: queueId,
      userId,
    },
    include: {
      tasks: {
        orderBy: { orderIndex: "asc" },
        include: {
          targetCompany: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      },
    },
  });

  if (!queue) {
    throw new Error("Discovery queue not found");
  }

  return queue;
};

export const getNextLinkedInDiscoveryTaskService = async (
  userId: string,
  queueId: string
) => {
  const queue = await outreachDb.outreachDiscoveryQueue.findFirst({
    where: {
      id: queueId,
      userId,
    },
  });

  if (!queue) {
    throw new Error("Discovery queue not found");
  }

  const task = await outreachDb.outreachDiscoveryTask.findFirst({
    where: {
      queueId,
      userId,
      status: {
        in: [
          OutreachDiscoveryTaskStatus.OPENED,
          OutreachDiscoveryTaskStatus.PENDING,
        ],
      },
    },
    orderBy: { orderIndex: "asc" },
    include: {
      targetCompany: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
    },
  });

  if (!task) {
    const refreshedQueue = await refreshQueueProgress(queueId);

    return {
      queue: refreshedQueue,
      task: null,
    };
  }

  if (queue.status === OutreachDiscoveryQueueStatus.PENDING) {
    await outreachDb.outreachDiscoveryQueue.update({
      where: { id: queueId },
      data: {
        status: OutreachDiscoveryQueueStatus.ACTIVE,
      },
    });
  }

  return {
    queue,
    task,
  };
};

export const markLinkedInDiscoveryTaskOpenedService = async (
  userId: string,
  taskId: string
) => {
  const task = await outreachDb.outreachDiscoveryTask.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

  if (!task) {
    throw new Error("Discovery task not found");
  }

  if (task.status !== OutreachDiscoveryTaskStatus.PENDING) {
    return task;
  }

  await outreachDb.outreachDiscoveryQueue.update({
    where: { id: task.queueId },
    data: { status: OutreachDiscoveryQueueStatus.ACTIVE },
  });

  return outreachDb.outreachDiscoveryTask.update({
    where: { id: taskId },
    data: {
      status: OutreachDiscoveryTaskStatus.OPENED,
      openedAt: new Date(),
    },
  });
};

export const skipLinkedInDiscoveryTaskService = async (
  userId: string,
  taskId: string
) => {
  const task = await outreachDb.outreachDiscoveryTask.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

  if (!task) {
    throw new Error("Discovery task not found");
  }

  const updatedTask = await outreachDb.outreachDiscoveryTask.update({
    where: { id: taskId },
    data: {
      status: OutreachDiscoveryTaskStatus.SKIPPED,
      skippedAt: new Date(),
    },
  });

  const queue = await refreshQueueProgress(task.queueId);

  return {
    queue,
    task: updatedTask,
  };
};

export const captureLinkedInDiscoveryTaskService = async (input: {
  userId: string;
  taskId: string;
  contacts: CapturedLinkedInContact[];
}) => {
  const task = await outreachDb.outreachDiscoveryTask.findFirst({
    where: {
      id: input.taskId,
      userId: input.userId,
    },
    include: {
      targetCompany: true,
    },
  });

  if (!task) {
    throw new Error("Discovery task not found");
  }

  if (COMPLETED_TASK_STATUSES.has(task.status)) {
    throw new Error("Discovery task is already completed");
  }

  const savedContacts = [];

  for (const capturedContact of input.contacts) {
    const linkedinUrl =
      capturedContact.linkedinUrl ?? capturedContact.profileUrl ?? null;

    const contact: DiscoveredContact = {
      name: capturedContact.name,
      role: capturedContact.role ?? null,
      company: capturedContact.company ?? task.targetCompany.name,
      email: null,
      linkedinUrl,
      contactType: task.contactType,
      emailStatus: OutreachEmailStatus.MISSING,
      provider: OutreachProvider.LINKEDIN_ASSISTED,
      providerContactId: null,
      raw: {
        source: "linkedin_assisted_discovery_queue",
        queueId: task.queueId,
        taskId: task.id,
        capturedContact,
      },
    };

    const saved = await saveDiscoveredContactService({
      userId: input.userId,
      targetCompanyId: task.targetCompanyId,
      companyName: task.targetCompany.name,
      contact,
    });

    savedContacts.push(saved);
  }

  const updatedTask = await outreachDb.outreachDiscoveryTask.update({
    where: { id: input.taskId },
    data: {
      status: OutreachDiscoveryTaskStatus.CAPTURED,
      capturedAt: new Date(),
      capturedCount: savedContacts.length,
    },
  });

  const queue = await refreshQueueProgress(task.queueId);

  return {
    queue,
    task: updatedTask,
    contacts: savedContacts,
  };
};
