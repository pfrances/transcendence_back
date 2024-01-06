import {ForbiddenException, Injectable} from '@nestjs/common';
import {SignInDto, SignUpDto} from './dto';
import {UserService} from 'src/user/user.service';
import {Http2FA, HttpAuth42, HttpSignIn, HttpSignUp} from 'src/shared/HttpEndpoints/auth';
import {JwtService} from 'src/jwt/jwt.service';
import {Auth2FADto} from './dto/Auth2fa.dto';
import {MailService} from 'src/mail/mail.service';
import {SendingMailInterface} from 'src/mail/interface/mail.interface';
import {Resend2FADto} from './dto/Resend2fa.dto';
import {UserPrivateProfile} from 'src/shared/HttpEndpoints/interfaces';
import {RefreshJwt} from 'src/jwt/interface/refreshJwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly user: UserService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}
  private static auth2FA_map = new Map<string, string>();

  async signup(dto: SignUpDto): Promise<HttpSignUp.resTemplate> {
    const auth2FADTO = await this.user.createUser(dto);
    const auth2FACode = await this.apply2FA(auth2FADTO);
    return {userId: auth2FADTO.userId, auth2FACode};
  }

  async signin(dto: SignInDto): Promise<HttpSignIn.resTemplate> {
    const privateProfile = await this.user.verifyUserCredential(dto);
    const {userId, nickname, email} = privateProfile;
    const auth2FACode = await this.apply2FA({nickname, email});
    return {userId, auth2FACode};
  }

  async handle42Callback(dto: UserPrivateProfile): Promise<HttpAuth42.resTemplate> {
    const {userId, nickname, email} = dto;
    const auth2FACode = await this.apply2FA({nickname, email});
    return {userId, auth2FACode};
  }

  async verify2fa(dto: Auth2FADto): Promise<Http2FA.resTemplate> {
    const confirmCode = AuthService.auth2FA_map.get(dto.auth2FACode);
    if (confirmCode !== dto.auth2FAConfirmCode) throw new ForbiddenException('invalid code');
    const userInfo = await this.user.getUserPrivateInfo({userId: dto.userId});
    const authToken = await this.jwt.createAuthToken(userInfo);
    const refreshToken = await this.jwt.createRefreshToken(userInfo);
    AuthService.auth2FA_map.delete(dto.auth2FACode);
    return {authToken, userInfo, refreshToken};
  }

  async resend2FA(dto: Resend2FADto): Promise<void> {
    const auth2FADTO = await this.user.getUserPrivateInfo({userId: dto.userId});
    const confirmCode = this.generateCode(6);
    AuthService.auth2FA_map.set(dto.auth2FACode, confirmCode);
    await this.mail.sendUserConfirmation(auth2FADTO, confirmCode);
  }

  private async apply2FA(dto: SendingMailInterface): Promise<string> {
    const code = this.generateCode(128);
    const confirm_code = this.generateCode(6);
    AuthService.auth2FA_map.set(code, confirm_code);
    await this.mail.sendUserConfirmation(dto, confirm_code);
    return code;
  }

  private generateCode(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  public refreshAccessToken(refreshToken: string, authToken: string): Promise<RefreshJwt> {
    return this.jwt.refreshAccessToken(refreshToken, authToken);
  }
}
