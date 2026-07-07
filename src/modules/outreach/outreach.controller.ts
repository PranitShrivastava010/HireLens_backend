import { Request, Response } from "express";
import {
  addTargetCompaniesService,
  autoDetectTargetCompaniesService,
  deleteTargetCompanyService,
  getTargetCompaniesService,
} from "./companies/company.service";
import { getOutreachContactsService } from "./contacts/contact.service";
import {
  captureLinkedInDiscoveryTaskService,
  createLinkedInDiscoveryQueueService,
  getLinkedInDiscoveryQueueService,
  getNextLinkedInDiscoveryTaskService,
  markLinkedInDiscoveryTaskOpenedService,
  skipLinkedInDiscoveryTaskService,
} from "./linkedin/discovery-queue.service";
import { OutreachContactType } from "./outreach.types";

export const addTargetCompaniesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const companies = await addTargetCompaniesService(userId, req.body.companies);

    res.status(201).json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add target companies",
    });
  }
};

export const getTargetCompaniesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const companies = await getTargetCompaniesService(userId);

    res.json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch target companies",
    });
  }
};

export const autoDetectTargetCompaniesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const companies = await autoDetectTargetCompaniesService(userId, req.body.limit ?? 50);

    res.json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to auto-detect target companies",
    });
  }
};

export const deleteTargetCompanyController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await deleteTargetCompanyService(userId, req.params.id);

    res.json({
      success: true,
      message: "Target company deleted",
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to delete target company",
    });
  }
};

export const getOutreachContactsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const requestedContactType = req.query.contactType as string | undefined;
    const contactType = requestedContactType && requestedContactType in OutreachContactType
      ? requestedContactType as OutreachContactType
      : undefined;

    const contacts = await getOutreachContactsService({
      userId,
      companyId: req.query.companyId as string | undefined,
      company: req.query.company as string | undefined,
      contactType,
    });

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch outreach contacts",
    });
  }
};

export const createDiscoveryQueueController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const queue = await createLinkedInDiscoveryQueueService({
      userId,
      name: req.body.name,
      targetCompanyIds: req.body.targetCompanyIds,
      includeRecruiters: req.body.includeRecruiters,
      includeHiringManagers: req.body.includeHiringManagers,
      includeEngineers: req.body.includeEngineers,
    });

    res.status(201).json({
      success: true,
      data: queue,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create discovery queue",
    });
  }
};

export const getDiscoveryQueueController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const queue = await getLinkedInDiscoveryQueueService(userId, req.params.queueId);

    res.json({
      success: true,
      data: queue,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to fetch discovery queue",
    });
  }
};

export const getNextDiscoveryTaskController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await getNextLinkedInDiscoveryTaskService(userId, req.params.queueId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to fetch next discovery task",
    });
  }
};

export const markDiscoveryTaskOpenedController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const task = await markLinkedInDiscoveryTaskOpenedService(userId, req.params.taskId);

    res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to mark discovery task opened",
    });
  }
};

export const captureDiscoveryTaskController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await captureLinkedInDiscoveryTaskService({
      userId,
      taskId: req.params.taskId,
      contacts: req.body.contacts,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to capture discovery task contacts",
    });
  }
};

export const skipDiscoveryTaskController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await skipLinkedInDiscoveryTaskService(userId, req.params.taskId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to skip discovery task",
    });
  }
};
