import {InvitationKind, InvitationStatus} from '@prisma/client';
import {BadRequestException} from '@nestjs/common';
import {InvitationAction_Url} from 'src/shared/HttpEndpoints/types';

abstract class UpdateInvitationBase {
  invitationId: number;
  status = InvitationStatus.PENDING;
  kind: InvitationKind;
}

export abstract class AcceptInvitation extends UpdateInvitationBase {
  receiverId: number;
  targetStatus: InvitationStatus;
}

export abstract class DeclineInvitation extends UpdateInvitationBase {
  receiverId: number;
  targetStatus: InvitationStatus = 'REFUSED';
}

export abstract class CancelInvitation extends UpdateInvitationBase {
  senderId: number;
  targetStatus: InvitationStatus = 'CANCELED';
}

export type UpdateInvitationStatus = AcceptInvitation | DeclineInvitation | CancelInvitation;

export function generateUpdateInvitationDto(
  userId: number,
  action: InvitationAction_Url,
  kind: InvitationKind,
  invitationId: number,
): UpdateInvitationStatus {
  const base: UpdateInvitationBase = {
    invitationId: invitationId,
    status: 'PENDING',
    kind: kind,
  };
  switch (action) {
    case 'accept':
      return {...base, receiverId: userId, targetStatus: 'ACCEPTED'};
    case 'decline':
      return {...base, receiverId: userId, targetStatus: 'REFUSED'};
    case 'cancel':
      return {...base, senderId: userId, targetStatus: 'CANCELED'};
    default:
      throw new BadRequestException(`Invalid Action: ${action}`);
  }
}
