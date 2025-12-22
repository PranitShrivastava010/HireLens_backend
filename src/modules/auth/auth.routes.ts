import { Router } from "express";
import {
  loginController,
  refreshTokenController,
  registerController,
  verifyOtpController,
} from "./auth.controller";

const router = Router();

router.post("/register", registerController);
router.post("/verify-otp", verifyOtpController);
router.post("/login", loginController)
router.post("/refresh", refreshTokenController)

export default router;
