import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { HTTP_STATUS } from "../constants";

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      // Replace req.body with validated data to catch transformations/defaults
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          errors: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
};
