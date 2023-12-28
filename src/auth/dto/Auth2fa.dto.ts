import {IsInt, IsNotEmpty, IsString} from 'class-validator';
import {Http2FA} from 'src/shared/HttpEndpoints/auth';

export class Auth2FADto {
  @IsString()
  @IsNotEmpty()
  auth2FACode: string;

  @IsString()
  @IsNotEmpty()
  auth2FAConfirmCode: string;

  @IsNotEmpty()
  @IsInt()
  userId: number;

  constructor(dto: Http2FA.reqTemplate) {
    this.auth2FACode = dto?.auth2FACode;
    this.auth2FAConfirmCode = dto?.auth2FAConfirmCode;
    this.userId = dto?.userId;
  }
}
