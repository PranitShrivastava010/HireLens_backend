import { Request, Response } from "express";
import {
  connectOutreachEmailService,
  createEmailOutreachService,
  getEmailOutreachCampaignsService,
  getOutreachEmailStatusService,
  markRecipientRepliedService,
} from "./email.outreach.service";

// POST /outreach/email/connect
// Saves the user's Gmail address and App Password (encrypted)
export const connectOutreachEmailController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { email, appPassword } = req.body;

    if (!email || !appPassword) {
      res.status(400).json({
        success: false,
        message: "Email and app password are required.",
      });
      return;
    }

    const result = await connectOutreachEmailService(userId, email, appPassword);

    res.status(200).json({
      success: true,
      message: "Email account connected successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to connect email account.",
    });
  }
};

// GET /outreach/email/status
// Returns whether the user has a connected outreach email
export const getOutreachEmailStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const result = await getOutreachEmailStatusService(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch email status.",
    });
  }
};

// POST /outreach/email/campaigns
// Creates a new campaign and queues all recipient emails via BullMQ
export const createEmailOutreachController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const result = await createEmailOutreachService(userId, req.body);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        campaignId: result.campaignId,
        totalRecipients: result.totalRecipients,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create email outreach campaign.",
    });
  }
};

// GET /outreach/email/campaigns
// Returns all campaigns for the logged-in user with their recipients
export const getEmailOutreachCampaignsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const campaigns = await getEmailOutreachCampaignsService(userId);

    res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch campaigns.",
    });
  }
};

// PUT /outreach/email/recipients/:recipientId/replied
// Marks a recipient as replied — stops their follow-up from being sent
export const markRecipientRepliedController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { recipientId } = req.params;

    const result = await markRecipientRepliedService(userId, recipientId);

    res.status(200).json({
      success: true,
      message: "Recipient marked as replied. Follow-up will not be sent.",
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || "Failed to mark recipient as replied.",
    });
  }
};
