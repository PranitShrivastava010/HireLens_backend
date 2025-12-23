import { SUCCESS_MESSAGES } from "../../../constants";
import { prisma } from "../../../lib/prisma";
import { hashPassword } from "../../../utils/hashPassword";
import { sendOtp } from "../../../utils/sendOtp";


export const registerService = async (
  email: string,
  name: string,
  password: string
) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser?.isVerified) {
    throw new Error("User already registered");
  }

  const hashedPassword = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { name, password: hashedPassword },
    create: {
      email,
      name,
      password: hashedPassword,
    },
  });

  await sendOtp(email);

  return { message: SUCCESS_MESSAGES.OTP_SENT.message };
};
