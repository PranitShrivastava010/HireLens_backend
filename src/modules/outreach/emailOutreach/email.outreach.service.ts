import { prisma } from "../../../lib/prisma";
import { encrypt } from "../../../utils/crypto";
import { EmailOutreachType } from "./email.outreach.schema";
import { emailSenderQueue } from "./email.outreach.queue";

// -------------------------------------------------------------------
// Service 1: Save SMTP credentials to the User's account
// -------------------------------------------------------------------
export const connectOutreachEmailService = async (
  userId: string,
  email: string,
  appPassword: string
) => {
  // Encrypt the app password before storing
  const encryptedPassword = encrypt(appPassword);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      outreachEmail: email,
      outreachAppPassword: encryptedPassword,
    },
    select: {
      id: true,
      outreachEmail: true,
    },
  });

  return user;
};

// -------------------------------------------------------------------
// Service 2: Create a campaign and enqueue all recipient emails
// -------------------------------------------------------------------
export const createEmailOutreachService = async (
  userId: string,
  data: EmailOutreachType
) => {
  const { subject, initialMessage, followUpMessage, resumeLink, emails } = data;

  // Step 1: Check if user has connected their outreach email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { outreachEmail: true, outreachAppPassword: true },
  });

  if (!user?.outreachEmail || !user?.outreachAppPassword) {
    throw new Error(
      "You must connect your email account before launching a campaign."
    );
  }

  // Step 2: Create campaign + recipients in a single transaction
  const campaign = await prisma.$transaction(async (tx) => {
    const newCampaign = await tx.emailOutreachCampaign.create({
      data: {
        userId,
        subject,
        initialMessage,
        followUpMessage: followUpMessage ?? null,
        resumeLink: resumeLink ?? null,
        status: "ACTIVE",
      },
    });

    await tx.emailOutreachRecipient.createMany({
      data: emails.map((email) => ({
        campaignId: newCampaign.id,
        email,
        status: "PENDING",
      })),
    });

    return newCampaign;
  });

  // Step 3: Fetch the created recipients to get their IDs for queueing
  const recipients = await prisma.emailOutreachRecipient.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, email: true },
  });

  // Step 4: Add a BullMQ job for each recipient
  const jobs = recipients.map((recipient) => ({
    name: "send-email",
    data: { recipientId: recipient.id, type: "initial" },
  }));

  await emailSenderQueue.addBulk(jobs);

  return {
    campaignId: campaign.id,
    totalRecipients: recipients.length,
    message: `Campaign created. ${recipients.length} emails queued for sending.`,
  };
};

// -------------------------------------------------------------------
// Service 3: Mark a recipient as replied (stops follow-up)
// -------------------------------------------------------------------
export const markRecipientRepliedService = async (
  userId: string,
  recipientId: string
) => {
  // Verify this recipient belongs to the requesting user
  const recipient = await prisma.emailOutreachRecipient.findFirst({
    where: {
      id: recipientId,
      campaign: { userId },
    },
  });

  if (!recipient) {
    throw new Error("Recipient not found or access denied.");
  }

  return prisma.emailOutreachRecipient.update({
    where: { id: recipientId },
    data: { status: "REPLIED" },
  });
};

// -------------------------------------------------------------------
// Service 4: Get all campaigns for a user (dashboard view)
// -------------------------------------------------------------------
export const getEmailOutreachCampaignsService = async (userId: string) => {
  return prisma.emailOutreachCampaign.findMany({
    where: { userId },
    orderBy: { id: "desc" },
    include: {
      recipients: {
        select: {
          id: true,
          email: true,
          status: true,
          initialSentAt: true,
          followUpScheduledFor: true,
          followUpSentAt: true,
        },
      },
    },
  });
};

// -------------------------------------------------------------------
// Service 5: Get outreach email connection status
// -------------------------------------------------------------------
export const getOutreachEmailStatusService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { outreachEmail: true, outreachAppPassword: true },
  });

  return {
    isConnected: !!(user?.outreachEmail && user?.outreachAppPassword),
    email: user?.outreachEmail ?? null,
  };
};