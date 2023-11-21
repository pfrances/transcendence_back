import {Role} from '@prisma/client';

export interface updateChatParticipant {
  userId: number;
  targetRole?: Role;
  muteUntil?: Date;
  blockUntil?: Date;
  kick?: boolean;
}

export interface UpdateChat {
  userId: number;
  chatId: number;
  name?: string;
  password?: string;
  chatAvatarUrl?: string;
  participants?: updateChatParticipant[];
}
