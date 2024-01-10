import {Role} from '@prisma/client';
import {Transform} from 'class-transformer';
import {IsBoolean, IsDate, IsEnum, IsNumber, IsOptional} from 'class-validator';
import {HttpUpdateChatParticipation} from 'src/shared/HttpEndpoints/chat';

export class UpdateChatParticipationDto {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsDate()
  @Transform(({value}) => (value ? new Date(value) : null))
  mutedUntil?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({value}) => (value ? new Date(value) : null))
  blockedUntil?: Date;

  @IsOptional()
  @IsBoolean()
  kick?: boolean;

  constructor(data: HttpUpdateChatParticipation.reqTemplate) {
    this.userId = data?.userId;
    this.role = data?.role;
    this.mutedUntil = data?.mutedUntil;
    this.blockedUntil = data?.blockedUntil;
    this.kick = data?.kick;
  }
}
