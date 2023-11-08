import {InvitationKind} from '@prisma/client';

export interface SendInvitation {
  senderId: number;
  receiverId: number;
  kind: InvitationKind;
  targetChatId?: number;
  targetGameId?: number;
}
