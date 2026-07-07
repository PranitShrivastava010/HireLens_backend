import { prisma } from "../../lib/prisma";

type PrismaDelegate = {
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  create(args: any): Promise<any>;
  createMany(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
};

export const outreachDb = prisma as typeof prisma & {
  targetCompany: PrismaDelegate;
  outreachCompanyJob: PrismaDelegate;
  outreachContact: PrismaDelegate;
  outreachDiscoveryQueue: PrismaDelegate;
  outreachDiscoveryTask: PrismaDelegate;
};
