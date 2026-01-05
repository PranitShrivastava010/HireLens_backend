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

    const { accessToken, refreshToken, sendUser } = await verifyOtpService(email, otp);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // REQUIRED for SameSite=None
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.OTP_VERIFIED.code,
      message: SUCCESS_MESSAGES.OTP_VERIFIED.message,
      Result: { accessToken, sendUser }
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

    const { accessToken, refreshToken, sendUser } = await loginService(email, password);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // REQUIRED for SameSite=None
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL.code,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL.message,
      Result: { accessToken, sendUser }
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
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const result = await refreshTokenService(refreshToken);

    if (!result) {
      // Token was already used, expired, or invalid
      return res.status(401).json({
        success: false,
        message: "Refresh token invalid or already used",
      });
    }

    const { accessToken, refreshToken: newRefreshToken, user } = result;

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true, // REQUIRED for SameSite=None
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      code: SUCCESS_MESSAGES.TOKEN_REFRESH.code,
      message: SUCCESS_MESSAGES.TOKEN_REFRESH.message,
      accessToken: accessToken,
      user: user
    });
  } catch (err) {
    next(err);
  }
};