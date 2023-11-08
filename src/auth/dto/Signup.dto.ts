import {IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl} from 'class-validator';
import {HttpSignUp} from 'src/shared/HttpEndpoints/auth';

export class SignUpDto implements HttpSignUp.reqTemplate {
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
}
