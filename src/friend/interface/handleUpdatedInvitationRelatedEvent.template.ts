import {InvitationKind, InvitationStatus} from '@prisma/client';

interface HandleUpdatedChatInvitationRelatedEvent {
  kind: 'CHAT';
  targetChatId: number;
}

type HandleUpdatedFriendInvitationRelatedEvent = {
  kind: 'FRIEND';
};

type HandleUpdatedGameInvitationRelatedEvent = {
  kind: 'GAME';
  targetGameId: number;
};

export type HandleUpdatedInvitationRelatedEvent = {
  invitationId: number;
  kind: InvitationKind;
  targetStatus: InvitationStatus;
  senderId: number;
  receiverId: number;
} & (
  | HandleUpdatedChatInvitationRelatedEvent
  | HandleUpdatedFriendInvitationRelatedEvent
  | HandleUpdatedGameInvitationRelatedEvent
);
