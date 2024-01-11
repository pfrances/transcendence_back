import {Role} from '@prisma/client';

export type updateChatParticipant = {
  userId: number;
  chatId: number;
} & (
  | {
      role?: Role;
      mutedUntil?: Date | null;
      blockedUntil?: Date | null;
    }
  | {kick: boolean}
);

export interface UpdateChat {
  userId: number;
  chatId: number;
  chatName?: string;
  password?: string | null;
  chatAvatar?: Express.Multer.File;
}
