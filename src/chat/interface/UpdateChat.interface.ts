import {Role} from '@prisma/client';

export interface updateChatParticipant {
  userId: number;
  role?: Role;
  mutedUntil?: Date;
  blockedUntil?: Date;
  kick?: boolean;
}

export interface UpdateChat {
  userId: number;
  chatId: number;
  chatName?: string;
  password?: string;
  chatAvatar?: Express.Multer.File;
  participants?: updateChatParticipant[];
}
