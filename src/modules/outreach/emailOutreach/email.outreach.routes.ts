import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import { EmailOutreachSchema } from "./email.outreach.schema";
import {
  connectOutreachEmailController,
  createEmailOutreachController,
  getEmailOutreachCampaignsController,
  getOutreachEmailStatusController,
  markRecipientRepliedController,
} from "./email.outreach.controller";

const router = Router();

// Check if user has connected their Gmail account
router.get("/status", authMiddleware, getOutreachEmailStatusController);

// Connect (or update) Gmail SMTP credentials
router.post("/connect", authMiddleware, connectOutreachEmailController);

// Create a campaign and queue all emails
router.post(
  "/campaigns",
  authMiddleware,
  validate(EmailOutreachSchema),
  createEmailOutreachController
);

// Get all campaigns for the logged-in user
router.get("/campaigns", authMiddleware, getEmailOutreachCampaignsController);

// Mark a specific recipient as replied (stops follow-up)
router.put(
  "/recipients/:recipientId/replied",
  authMiddleware,
  markRecipientRepliedController
);

export default router;
