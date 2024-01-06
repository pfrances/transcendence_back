import {IsInt, IsNotEmpty, IsString} from 'class-validator';
import {Http2FA} from 'src/shared/HttpEndpoints/auth';

export class Auth2FADto {
  @IsNotEmpty()
  @IsString()
  auth2FACode: string;

  @IsNotEmpty()
  @IsString()
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
