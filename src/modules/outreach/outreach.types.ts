export const TargetCompanySource = {
  MANUAL: "MANUAL",
  JOB_AUTO_DETECTED: "JOB_AUTO_DETECTED",
} as const;

export type TargetCompanySource =
  (typeof TargetCompanySource)[keyof typeof TargetCompanySource];

export const OutreachProvider = {
  LINKEDIN_ASSISTED: "LINKEDIN_ASSISTED",
} as const;

export type OutreachProvider =
  (typeof OutreachProvider)[keyof typeof OutreachProvider];

export const OutreachContactType = {
  RECRUITER: "RECRUITER",
  HIRING_MANAGER: "HIRING_MANAGER",
  ENGINEER: "ENGINEER",
  OTHER: "OTHER",
} as const;

export type OutreachContactType =
  (typeof OutreachContactType)[keyof typeof OutreachContactType];

export const OutreachEmailStatus = {
  VERIFIED: "VERIFIED",
  UNVERIFIED: "UNVERIFIED",
  MISSING: "MISSING",
} as const;

export type OutreachEmailStatus =
  (typeof OutreachEmailStatus)[keyof typeof OutreachEmailStatus];

export const OutreachDiscoveryQueueStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type OutreachDiscoveryQueueStatus =
  (typeof OutreachDiscoveryQueueStatus)[keyof typeof OutreachDiscoveryQueueStatus];

export const OutreachDiscoveryTaskStatus = {
  PENDING: "PENDING",
  OPENED: "OPENED",
  CAPTURED: "CAPTURED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
} as const;

export type OutreachDiscoveryTaskStatus =
  (typeof OutreachDiscoveryTaskStatus)[keyof typeof OutreachDiscoveryTaskStatus];
