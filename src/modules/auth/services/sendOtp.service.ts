import { prisma } from "../../../lib/prisma";
import { generateOtp, hashOtp } from "../../../utils/otp";
import { mailTransporter } from "../../../config/mail";


export const sendOtp = async (email: string,) => {
  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  // delete old OTPs
  await prisma.otp.deleteMany({ where: { email } });

  await prisma.otp.create({
    data: {
      email,
      otp: hashedOtp,
      expiresAt,
    },
  });

  await mailTransporter.sendMail({
    from: `"HireLens" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your HireLens verification code",
    html: `<h2>${otp}</h2><p>This code expires in 5 minutes</p>`,
  });

  return { message: "OTP sent successfully" };
};
