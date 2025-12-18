import { Request, Response, NextFunction } from "express";
import { sendOtp } from "./services/sendOtp.service";
import { verifyOtp } from "./services/verifyOtp.service";

export const requestOtpController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name } = req.body;
    const result = await sendOtp(email, name);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyOtpController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOtp(email, otp);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
