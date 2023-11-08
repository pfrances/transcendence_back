import {Role} from '@prisma/client';

export interface UpdateChat {
  userId: number;
  chatId: number;
  name?: string;
  password?: string;
  chatAvatarUrl?: string;
  participants?: {
    userId: number;
    targetRole?: Role;
    muteUntil?: Date;
    blockUntil?: Date;
    kick?: boolean;
  }[];
}
