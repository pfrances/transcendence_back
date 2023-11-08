export interface Prisma42User {
  userId: number;
  user42Id: number;
  nickname?: string;
  email: string;
  avatarUrl?: string;
}

export interface PrismaStandardUser {
  userId: number;
  nickname?: string;
  email: string;
  hashedPassword: string;
  avatarUrl?: string;
}

export type PrismaUser = Prisma42User | PrismaStandardUser;
