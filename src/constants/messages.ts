export const SUCCESS_MESSAGES = {
  OTP_SENT: {
    code: "OTP_SENT",
    message: "OTP sent successfully to your email",
  },

  OTP_VERIFIED: {
    code: "OTP_VERIFIED",
    message: "OTP verified successfully",
  },

  USER_REGISTERED: {
    code: "USER_REGISTERED",
    message: "User registered successfully",
  },

  LOGIN_SUCCESSFUL:{
    code: "LOGIN_SUCCESSFUL",
    message: "User logged in successfully"
  },

  TOKEN_REFRESH: {
    code: "TOKEN_REFRESH",
    message: "Token refreshed successfully"
  },

  JOBS_FETCHED: {
    code: "JOBS_FETCHED",
    message: "Jobs fetched successfully",
  },

  APPLICATION_SUCCESS: {
    code: "APPLICATION_SUCCESS",
    message: "Job added to application successfully"
  }
};

export const ERROR_MESSAGES = {
  NAME_REQUIRED: {
    code: "NAME_REQUIRED",
    message: "Name is required to complete registration",
  },

  REGISTRATION_FAILED: {
    code: "REGISTRATION_FAILED",
    message: "Failed to register user"
  },

  LOGIN_FAILED: {
    code: "LOGIN_FAILED",
    message: "Failed to login"
  },

  OTP_NOT_FOUND: {
    code: "OTP_NOT_FOUND",
    message: "OTP not found",
  },

  OTP_EXPIRED: {
    code: "OTP_EXPIRED",
    message: "OTP has expired",
  },

  OTP_INVALID: {
    code: "OTP_INVALID",
    message: "Invalid OTP",
  },

  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "Unauthorized access",
  },

  INVALID_TOKEN: {
    code: "INVALID_TOKEN",
    message: "Invalid or expired token",
  },

  SOMETHING_WENT_WRONG: {
    code: "SOMETHING_WENT_WRONG",
    message: "Something went wrong",
  },

  JOBID_NOT_FOUND: {
    code: "JOBID_NOT_FOUND",
    message: "Job ID is not provides or is invalid"
  },

  JOBID_AND_STATUS_NOT_FOUND: {
    code: "JOBID_AND_STATUS_NOT_FOUND",
    message: "Job ID and status is not provides or is invalid"
  },
};
