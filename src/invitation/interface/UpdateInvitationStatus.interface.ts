import {InvitationKind, InvitationStatus} from '@prisma/client';
import {BadRequestException} from '@nestjs/common';
import {InvitationAction_Url} from 'src/shared/HttpEndpoints/types';

abstract class UpdateInvitationBase {
  invitationId: number;
  status = InvitationStatus.PENDING;
  kind: InvitationKind;

  constructor(data: UpdateInvitationBase) {
    this.invitationId = data.invitationId;
    this.status = data.status;
    this.kind = data.kind;
  }
}

export abstract class AcceptInvitation extends UpdateInvitationBase {
  receiverId: number;
  targetStatus: InvitationStatus;

  constructor(data: AcceptInvitation) {
    super(data);
    this.receiverId = data.receiverId;
    this.targetStatus = data.targetStatus;
  }
}

export abstract class DeclineInvitation extends UpdateInvitationBase {
  receiverId: number;
  targetStatus: InvitationStatus = 'REFUSED';

  constructor(data: DeclineInvitation) {
    super(data);
    this.receiverId = data.receiverId;
    this.targetStatus = data.targetStatus;
  }
}

export abstract class CancelInvitation extends UpdateInvitationBase {
  senderId: number;
  targetStatus: InvitationStatus = 'CANCELED';

  constructor(data: CancelInvitation) {
    super(data);
    this.senderId = data.senderId;
    this.targetStatus = data.targetStatus;
  }
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
