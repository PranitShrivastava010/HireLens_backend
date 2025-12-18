import { Router } from "express";
import {
  requestOtpController,
  verifyOtpController,
} from "./auth.controller";

const router = Router();

router.post("/send-otp", requestOtpController);
router.post("/verify-otp", verifyOtpController);

export default router;
