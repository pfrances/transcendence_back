import {ForbiddenException, Injectable} from '@nestjs/common';
import {SignInDto, SignUpDto} from './dto';
import {UserService} from 'src/user/user.service';
import {Http2FA, HttpAuth42VerifyCode, HttpSignIn, HttpSignUp} from 'src/shared/HttpEndpoints/auth';
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
  private static auth42Code_map = new Map<number, string>();

  async signup(dto: SignUpDto): Promise<HttpSignUp.resTemplate> {
    const user = await this.user.createUser(dto);
    const authToken = await this.jwt.createAuthToken(user);
    const refreshToken = await this.jwt.createRefreshToken(user);
    return {userId: user.userId, authToken, refreshToken};
  }

  async signin(dto: SignInDto): Promise<HttpSignIn.resTemplate> {
    const privateProfile = await this.user.verifyUserCredential(dto);
    const {userId, nickname, email, hasSet2Fa} = privateProfile;
    if (hasSet2Fa) {
      const auth2FACode = await this.apply2FA({nickname, email});
      return {userId, auth2FACode};
    }
    const authToken = await this.jwt.createAuthToken(privateProfile);
    const refreshToken = await this.jwt.createRefreshToken(privateProfile);
    return {userId, authToken, refreshToken};
  }

  async handle42Callback(
    dto: UserPrivateProfile,
  ): Promise<{userId: number} & ({auth2FACode: string} | {code: string})> {
    const {userId, nickname, email, hasSet2Fa} = dto;
    if (hasSet2Fa) {
      const auth2FACode = await this.apply2FA({nickname, email});
      return {userId, auth2FACode};
    }
    const code = this.generateCode(128);
    AuthService.auth42Code_map.set(userId, code);
    return {userId, code};
  }

  async verify42(dto: {userId: number; code: string}): Promise<HttpAuth42VerifyCode.resTemplate> {
    if (!AuthService.auth42Code_map.has(dto.userId)) throw new ForbiddenException('invalid code');
    const confirmCode = AuthService.auth42Code_map.get(dto.userId);
    if (confirmCode !== dto.code) throw new ForbiddenException('invalid code');
    const userInfo = await this.user.getUserPrivateInfo({userId: dto.userId});
    const authToken = await this.jwt.createAuthToken(userInfo);
    const refreshToken = await this.jwt.createRefreshToken(userInfo);
    AuthService.auth42Code_map.delete(dto.userId);
    return {authToken, userInfo, refreshToken};
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
