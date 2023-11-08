import {IsEmail, IsOptional, IsString, IsUrl} from 'class-validator';
import {HttpEditMe} from 'src/shared/HttpEndpoints/user';

export class EditUserDto implements HttpEditMe.reqTemplate {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  password?: string;
}
