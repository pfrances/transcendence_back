import {Role} from '@prisma/client';

export type updateChatParticipant = {
  userId: number;
  chatId: number;
} & (
  | {
      role?: Role;
      mutedUntil?: Date | null;
    }
  | {kick: boolean}
  | {ban: boolean}
);

export interface UpdateChat {
  userId: number;
  chatId: number;
  chatName?: string;
  password?: string | null;
  isPrivate?: boolean;
  chatAvatar?: Express.Multer.File;
}
