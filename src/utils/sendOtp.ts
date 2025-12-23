import { mailTransporter } from "../config/mail";
import { prisma } from "../lib/prisma";
import { generateOtp, hashOtp } from "./otp";

export const sendOtp = async (email: string) => {
  const otp = generateOtp();          // 1. Generate 6-digit OTP
  const hashedOtp = hashOtp(otp);     // 2. Hash OTP (security)

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 3. 5 mins expiry

  // 4. Remove old OTPs for this email
  await prisma.otp.deleteMany({ where: { email } });

  // 5. Save hashed OTP in DB
  await prisma.otp.create({
    data: {
      email,
      otp: hashedOtp,
      expiresAt,
    },
  });

  // 6. Send OTP via email
  await mailTransporter.sendMail({
    from: `"HireLens" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your HireLens verification code",
    html: `<h2>${otp}</h2><p>This code expires in 5 minutes</p>`,
  });

  return { message: "OTP sent successfully" };
};
