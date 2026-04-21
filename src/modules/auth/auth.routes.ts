import { Router } from "express";
import {
  loginController,
  refreshTokenController,
  registerController,
  verifyOtpController,
} from "./auth.controller";

import { validate } from "../../middlewares/validate.middleware";
import { loginSchema, registerSchema, verifyOtpSchema } from "./auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), registerController);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtpController);
router.post("/login", validate(loginSchema), loginController);
router.post("/refresh", refreshTokenController);

export default router;
