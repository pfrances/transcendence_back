import {InvitationKind, InvitationStatus} from '@prisma/client';

export interface HandleUpdatedInvitationRelatedEvent {
  invitationId: number;
  kind: InvitationKind;
  targetStatus: InvitationStatus;
  senderId: number;
  receiverId: number;
  targetChatId?: number;
  targetGameId?: number;
}
