import { Request, Response, NextFunction } from "express";
import { registerService } from "./services/register.service";
import { verifyOtpService } from "./services/verifyOtp.service";
import { ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES } from "../../constants";
import { loginService } from "./services/login.service";
import { refreshTokenService } from "./services/refreshToken.service";

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, name, password } = req.body;

    const result = await registerService(email, name, password);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.USER_REGISTERED.code,
      message: SUCCESS_MESSAGES.USER_REGISTERED.message,
      result,
    });
  } catch (err) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      code: ERROR_MESSAGES.REGISTRATION_FAILED.code,
      message: ERROR_MESSAGES.REGISTRATION_FAILED.message,
      Error: err
    })
  }
};

export const verifyOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyOtpService(email, otp);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.OTP_VERIFIED.code,
      message: SUCCESS_MESSAGES.OTP_VERIFIED.message,
      Result: result
    });
  } catch (err) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      code: ERROR_MESSAGES.REGISTRATION_FAILED.code,
      message: ERROR_MESSAGES.REGISTRATION_FAILED.message,
      Error: err
    })
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(email, password);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL.code,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL.message,
      Result: result
    });
  } catch (err) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      code: ERROR_MESSAGES.LOGIN_FAILED.code,
      message: ERROR_MESSAGES.LOGIN_FAILED.message,
      Error: err
    })
  }
};

export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    const result = await refreshTokenService(refreshToken);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.TOKEN_REFRESH.code,
      message: SUCCESS_MESSAGES.TOKEN_REFRESH.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};