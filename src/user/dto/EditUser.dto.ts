import {IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl} from 'class-validator';
import {HttpEditMe} from 'src/shared/HttpEndpoints/user';

export class EditUserDto implements HttpEditMe.reqTemplate {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nickname?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  password?: string;
}
