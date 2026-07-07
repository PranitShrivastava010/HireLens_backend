import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  addTargetCompaniesController,
  autoDetectTargetCompaniesController,
  captureDiscoveryTaskController,
  createDiscoveryQueueController,
  deleteTargetCompanyController,
  getDiscoveryQueueController,
  getNextDiscoveryTaskController,
  getOutreachContactsController,
  getTargetCompaniesController,
  markDiscoveryTaskOpenedController,
  skipDiscoveryTaskController,
} from "./outreach.controller";
import emailOutreachRouter from "./emailOutreach/email.outreach.routes";
import {
  addTargetCompaniesSchema,
  autoDetectCompaniesSchema,
  captureDiscoveryTaskSchema,
  createDiscoveryQueueSchema,
} from "./outreach.schema";

const router = Router();

router.post(
  "/companies",
  authMiddleware,
  validate(addTargetCompaniesSchema),
  addTargetCompaniesController
);
router.get("/companies", authMiddleware, getTargetCompaniesController);
router.post(
  "/companies/auto-detect",
  authMiddleware,
  validate(autoDetectCompaniesSchema),
  autoDetectTargetCompaniesController
);
router.delete("/companies/:id", authMiddleware, deleteTargetCompanyController);
router.get("/contacts", authMiddleware, getOutreachContactsController);
router.post(
  "/discovery-queues",
  authMiddleware,
  validate(createDiscoveryQueueSchema),
  createDiscoveryQueueController
);
router.get(
  "/discovery-queues/:queueId/next",
  authMiddleware,
  getNextDiscoveryTaskController
);
router.get(
  "/discovery-queues/:queueId",
  authMiddleware,
  getDiscoveryQueueController
);
router.post(
  "/discovery-queues/tasks/:taskId/opened",
  authMiddleware,
  markDiscoveryTaskOpenedController
);
router.post(
  "/discovery-queues/tasks/:taskId/capture",
  authMiddleware,
  validate(captureDiscoveryTaskSchema),
  captureDiscoveryTaskController
);
router.post(
  "/discovery-queues/tasks/:taskId/skip",
  authMiddleware,
  skipDiscoveryTaskController
);
// Mount email outreach sub-router
router.use("/email", emailOutreachRouter);

export default router;
