import { DiscoveredContact } from "./contact.types";
import { outreachDb } from "../outreach.prisma";
import { OutreachEmailStatus } from "../outreach.types";

const normalizeEmail = (email?: string | null) => {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
};

const normalizeLinkedInUrl = (url?: string | null) => {
  const trimmed = url?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
};

const shouldPromoteEmailStatus = (
  current: OutreachEmailStatus,
  next: OutreachEmailStatus
) => {
  if (current === OutreachEmailStatus.VERIFIED) {
    return false;
  }

  return next === OutreachEmailStatus.VERIFIED || current === OutreachEmailStatus.MISSING;
};

export const saveDiscoveredContactService = async (input: {
  userId: string;
  targetCompanyId: string;
  companyName: string;
  contact: DiscoveredContact;
}) => {
  const email = normalizeEmail(input.contact.email);
  const linkedinUrl = normalizeLinkedInUrl(input.contact.linkedinUrl);
  const name = input.contact.name.trim();

  const existing = await outreachDb.outreachContact.findFirst({
    where: {
      userId: input.userId,
      OR: [
        ...(email ? [{ email }] : []),
        ...(linkedinUrl ? [{ linkedinUrl }] : []),
        {
          targetCompanyId: input.targetCompanyId,
          name,
        },
      ],
    },
  });

  if (existing) {
    return outreachDb.outreachContact.update({
      where: { id: existing.id },
      data: {
        role: existing.role ?? input.contact.role ?? undefined,
        company: existing.company || input.contact.company || input.companyName,
        email: existing.email ?? email,
        linkedinUrl: existing.linkedinUrl ?? linkedinUrl,
        contactType: existing.contactType,
        emailStatus: shouldPromoteEmailStatus(existing.emailStatus, input.contact.emailStatus)
          ? input.contact.emailStatus
          : existing.emailStatus,
        provider: existing.provider,
        providerContactId: existing.providerContactId ?? input.contact.providerContactId ?? undefined,
        providerRaw: existing.providerRaw ?? input.contact.raw as any,
      },
    });
  }

  return outreachDb.outreachContact.create({
    data: {
      userId: input.userId,
      targetCompanyId: input.targetCompanyId,
      name,
      role: input.contact.role ?? null,
      company: input.contact.company ?? input.companyName,
      email,
      linkedinUrl,
      contactType: input.contact.contactType,
      emailStatus: input.contact.emailStatus,
      provider: input.contact.provider,
      providerContactId: input.contact.providerContactId ?? null,
      providerRaw: input.contact.raw as any,
    },
  });
};
