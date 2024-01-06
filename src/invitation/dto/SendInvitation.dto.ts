import {IsNumber, IsOptional} from 'class-validator';

export class SendInvitationDto {
  @IsNumber()
  targetUserId: number;

  @IsOptional()
  @IsNumber()
  targetChatId?: number;

  @IsOptional()
  @IsNumber()
  targetGameId?: number;

  constructor(dto: SendInvitationDto) {
    this.targetUserId = dto?.targetUserId;
    this.targetChatId = dto?.targetChatId;
    this.targetGameId = dto?.targetGameId;
  }
}
