import { outreachDb } from "../outreach.prisma";
import { OutreachContactType } from "../outreach.types";

export const getOutreachContactsService = async (input: {
  userId: string;
  companyId?: string;
  company?: string;
  contactType?: OutreachContactType;
}) => {
  return outreachDb.outreachContact.findMany({
    where: {
      userId: input.userId,
      ...(input.companyId ? { targetCompanyId: input.companyId } : {}),
      ...(input.company
        ? {
            company: {
              contains: input.company,
              mode: "insensitive",
            },
          }
        : {}),
      ...(input.contactType ? { contactType: input.contactType } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      targetCompany: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
    },
  });
};
