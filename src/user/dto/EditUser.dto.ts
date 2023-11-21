import {IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl} from 'class-validator';
import {HttpEditMe} from 'src/shared/HttpEndpoints/user';

export class EditUserDto {
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

  constructor(dto: HttpEditMe.reqTemplate) {
    this.email = dto?.email;
    this.nickname = dto?.nickname;
    this.avatarUrl = dto?.avatarUrl;
    this.password = dto?.password;
  }
}
