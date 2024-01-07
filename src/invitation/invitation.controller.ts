import {Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards} from '@nestjs/common';
import {InvitationsService} from './invitation.service';
import {generateUpdateInvitationDto} from './interface';
import {InvitationActionPipe, InvitationKindPipe} from './pipe';
import {JwtAuthGuard} from 'src/auth/guard';
import {GetInfoFromJwt} from 'src/decorator';
import {InvitationKind} from '@prisma/client';
import {SendInvitationDto} from './dto/SendInvitation.dto';
import {InvitationAction_Url} from 'src/shared/HttpEndpoints/types';
import {
  HttpGetInvitations,
  HttpInvitation,
  HttpSendInvitation,
  HttpUpdateInvitation,
} from 'src/shared/HttpEndpoints/invitation';

@Controller(HttpInvitation.endPointBase)
@UseGuards(JwtAuthGuard)
export class InvitationController {
  constructor(private readonly invitation: InvitationsService) {}

  @Post(HttpSendInvitation.endPoint)
  async sendInvidationHandler(
    @GetInfoFromJwt('userId') userId: number,
    @Param('kind', new InvitationKindPipe()) kind: InvitationKind,
    @Body() dto: SendInvitationDto,
  ): Promise<HttpSendInvitation.resTemplate> {
    await this.invitation.sendInvitation({
      receiverId: dto.targetUserId,
      ...dto,
      senderId: userId,
      kind,
    });
    return {};
  }

  @Post(HttpUpdateInvitation.endPoint)
  async invitationActionHandler(
    @GetInfoFromJwt('userId') userId: number,
    @Param('kind', new InvitationKindPipe()) kind: InvitationKind,
    @Param('action', new InvitationActionPipe()) action: InvitationAction_Url,
    @Param('invitationId', ParseIntPipe) invitationId: number,
  ): Promise<HttpUpdateInvitation.resTemplate> {
    const dto = generateUpdateInvitationDto(userId, action, kind, invitationId);
    await this.invitation.updateInvitationStatus(dto);
    return {};
  }

  @Get(HttpGetInvitations.endPoint)
  async getInvitationsHandler(
    @GetInfoFromJwt('userId') userId: number,
    @Param('kind', new InvitationKindPipe()) kind: InvitationKind,
  ): Promise<HttpGetInvitations.resTemplate> {
    const invitations = await this.invitation.getInvitations(userId, kind);
    return {invitations};
  }
}
