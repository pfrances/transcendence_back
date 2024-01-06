import {IsInt, IsNotEmpty, IsString} from 'class-validator';
import {Http2FA} from 'src/shared/HttpEndpoints/auth';

export class Resend2FADto {
  @IsNotEmpty()
  @IsString()
  auth2FACode: string;

  @IsNotEmpty()
  @IsInt()
  userId: number;

  constructor(dto: Http2FA.reqTemplate) {
    this.auth2FACode = dto?.auth2FACode;
    this.userId = dto?.userId;
  }
}
