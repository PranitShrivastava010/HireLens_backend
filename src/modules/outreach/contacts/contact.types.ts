import {
  OutreachContactType,
  OutreachEmailStatus,
  OutreachProvider,
} from "../outreach.types";

export type DiscoveredContact = {
  name: string;
  role?: string | null;
  company?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  contactType: OutreachContactType;
  emailStatus: OutreachEmailStatus;
  provider: OutreachProvider;
  providerContactId?: string | null;
  raw?: unknown;
};
