import { Request, Response, NextFunction } from "express";
import { sendOtp } from "./services/sendOtp.service";
import { verifyOtpService } from "./services/verifyOtp.service";
import { ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES } from "../../constants";

export const requestOtpController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await sendOtp(email);
    res.send(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.OTP_SENT.code,
      message: SUCCESS_MESSAGES.OTP_SENT.message,
      result
    });
  } catch (err) {
    next(err);
  }
};

export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const { email, otp, name } = req.body;

    const result = await verifyOtpService(email, otp, name);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.OTP_VERIFIED.code,
      message: SUCCESS_MESSAGES.OTP_VERIFIED.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err: any) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: ERROR_MESSAGES.SOMETHING_WENT_WRONG.code,
      message: ERROR_MESSAGES.SOMETHING_WENT_WRONG.message,
    });
  }
};
