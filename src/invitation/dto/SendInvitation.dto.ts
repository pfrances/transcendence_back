import {IsNumber, IsOptional} from 'class-validator';

export class SendInvitationDto {
  @IsNumber()
  targetUserId: number;

  @IsNumber()
  @IsOptional()
  targetChatId?: number;

  @IsNumber()
  @IsOptional()
  targetGameId?: number;
}
