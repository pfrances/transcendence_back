import {IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl} from 'class-validator';
import {HttpSignUp} from 'src/shared/HttpEndpoints/auth';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  constructor(dto: HttpSignUp.reqTemplate) {
    this.nickname = dto.nickname;
    this.email = dto.email;
    this.password = dto.password;
    this.avatarUrl = dto.avatarUrl;
  }
}
