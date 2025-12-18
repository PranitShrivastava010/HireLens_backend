import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ERROR_MESSAGES, HTTP_STATUS } from "../constants";
import { JWT_CONFIG } from "../config/jwtConfig";

interface JwtPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        code: ERROR_MESSAGES.UNAUTHORIZED.code,
        message: ERROR_MESSAGES.UNAUTHORIZED.message,
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      JWT_CONFIG.ACCESS_SECRET
    ) as JwtPayload;

    req.user = decoded;

    next(); // ✅ allow request
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      code: ERROR_MESSAGES.INVALID_TOKEN.code,
      message: ERROR_MESSAGES.INVALID_TOKEN.message,
    });
  }
};
