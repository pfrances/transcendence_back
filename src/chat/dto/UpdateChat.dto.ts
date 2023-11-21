import {Role} from '@prisma/client';
import {IsArray, IsNotEmpty, IsOptional} from 'class-validator';
import {HttpUpdateChat} from 'src/shared/HttpEndpoints/chat';

export class UpdateChatDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  password?: string;

  @IsOptional()
  @IsNotEmpty()
  chatAvatarUrl?: string;

  @IsOptional()
  @IsArray()
  participants?: {
    userId: number;
    targetRole?: Role;
    muteUntil?: Date;
    blockUntil?: Date;
    kick?: boolean;
  }[];

  constructor(data: HttpUpdateChat.reqTemplate) {
    this.name = data.name;
    this.password = data.password;
    this.chatAvatarUrl = data.chatAvatarUrl;
    this.participants = data.participants;
  }
}
