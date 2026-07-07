import { Queue, Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { prisma } from "../../../lib/prisma";
import { decrypt } from "../../../utils/crypto";
import { redis } from "../../../config/redis";

// --- Queue Definition ---
// This queue holds all email send jobs (both initial and follow-up)
export const emailSenderQueue = new Queue("email-sender-queue", {
  connection: {
    url: process.env.BULLMQ_REDIS_URL!,
  },
});

// --- Helper: Check and increment daily limit ---
const checkDailyLimit = async (
  userId: string,
  limit: number = 15
): Promise<boolean> => {
  const today = new Date().toISOString().split("T")[0]; // e.g. "2026-07-01"
  const key = `outreach_limit:${userId}:${today}`;

  // Atomically increment the counter
  const count = await redis.incr(key);

  // Set expiry to 48 hours on first increment so the key auto-cleans
  if (count === 1) {
    await redis.expire(key, 60 * 60 * 48);
  }

  if (count > limit) {
    // Undo the increment since we're not sending
    await redis.decr(key);
    return false; // limit exceeded
  }

  return true; // allowed to send
};

// --- Helper: Build a Nodemailer transport for a specific user ---
const buildTransport = (email: string, appPassword: string) => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: email,
      pass: appPassword,
    },
  });
};

// --- Worker: Processes every email job from the queue ---
export const emailSenderWorker = new Worker(
  "email-sender-queue",
  async (job: Job) => {
    const { recipientId, type } = job.data; // type: "initial" | "followup"

    // 1. Fetch recipient + campaign + user
    const recipient = await prisma.emailOutreachRecipient.findFirst({
      where: { id: recipientId },
      include: {
        campaign: {
          include: { user: true },
        },
      },
    });

    if (!recipient) throw new Error(`Recipient ${recipientId} not found`);
    if (!recipient.campaign) throw new Error("Campaign not found");

    const { campaign } = recipient;
    const { user } = campaign;

    // 2. Guard: If the recipient already replied or was stopped, skip silently
    if (["REPLIED", "STOPPED"].includes(recipient.status)) {
      console.log(`Skipping ${recipient.email} - status is ${recipient.status}`);
      return;
    }

    // 3. Check SMTP credentials exist
    if (!user.outreachEmail || !user.outreachAppPassword) {
      throw new Error(`User ${user.id} has no outreach credentials configured`);
    }

    // 4. Check daily limit
    const allowed = await checkDailyLimit(user.id, 15);
    if (!allowed) {
      // Delay this job by 24 hours and re-queue it
      await emailSenderQueue.add(
        "send-email",
        job.data,
        { delay: 24 * 60 * 60 * 1000 }
      );
      console.log(`Daily limit hit for user ${user.id}. Job delayed 24h.`);
      return;
    }

    // 5. Decrypt app password and send email
    const appPassword = decrypt(user.outreachAppPassword);
    const transport = buildTransport(user.outreachEmail, appPassword);

    if (type === "initial") {
      // Send initial email
      await transport.sendMail({
        from: user.outreachEmail,
        to: recipient.email,
        subject: campaign.subject,
        text: campaign.initialMessage,
      });

      // 6. Update DB: mark as initial sent
      const followUpScheduledFor = campaign.followUpMessage
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        : null;

      await prisma.emailOutreachRecipient.update({
        where: { id: recipientId },
        data: {
          status: "INITIAL_SENT",
          initialSentAt: new Date(),
          followUpScheduledFor,
        },
      });

      // 7. Schedule follow-up job if a follow-up message exists
      if (campaign.followUpMessage) {
        await emailSenderQueue.add(
          "send-email",
          { recipientId, type: "followup" },
          { delay: 7 * 24 * 60 * 60 * 1000 } // 7 days
        );
        console.log(`Follow-up scheduled for ${recipient.email} in 7 days`);
      }

    } else if (type === "followup") {
      // Guard: Re-check status in case user marked as replied in the 7-day window
      if (["REPLIED", "STOPPED"].includes(recipient.status)) {
        console.log(`Follow-up cancelled for ${recipient.email} - marked as ${recipient.status}`);
        return;
      }

      if (!campaign.followUpMessage) {
        console.log(`No follow-up message for campaign ${campaign.id}. Skipping.`);
        return;
      }

      // Send follow-up email
      await transport.sendMail({
        from: user.outreachEmail,
        to: recipient.email,
        subject: `Re: ${campaign.subject}`,
        text: campaign.followUpMessage,
      });

      // 8. Update DB: mark as follow-up sent and stop the sequence
      await prisma.emailOutreachRecipient.update({
        where: { id: recipientId },
        data: {
          status: "FOLLOWUP_SENT",
          followUpSentAt: new Date(),
        },
      });
    }
  },
  {
    connection: {
      url: process.env.BULLMQ_REDIS_URL!,
    },
    concurrency: 3, // Process up to 3 emails at the same time
  }
);

// Log worker events
emailSenderWorker.on("completed", (job: Job) => {
  console.log(`[EmailQueue] Job ${job.id} completed for recipient ${job.data.recipientId}`);
});

emailSenderWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`[EmailQueue] Job ${job?.id} failed:`, err.message);
});
