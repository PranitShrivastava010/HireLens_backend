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

  JOBS_FETCHED: {
    code: "JOBS_FETCHED",
    message: "Jobs fetched successfully",
  },
};

export const ERROR_MESSAGES = {
  NAME_REQUIRED: {
    code: "NAME_REQUIRED",
    message: "Name is required to complete registration",
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
  }
};
