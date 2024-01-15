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
  @Transform(({value}) => (value ? new Date(value) : value === null ? null : undefined))
  mutedUntil?: Date | null;

  @IsOptional()
  @IsBoolean()
  kick?: boolean;

  constructor(data: HttpUpdateChatParticipation.reqTemplate) {
    this.userId = data?.userId;
    this.role = data?.role;
    this.mutedUntil = data?.mutedUntil;
    this.kick = data?.kick;
  }
}
