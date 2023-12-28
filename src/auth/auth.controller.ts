import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {AuthService} from './auth.service';
import {FortyTwoAuthGuard} from './guard';
import {SignInDto, SignUpDto} from './dto';
import {
  Http2FA,
  HttpAuth,
  HttpAuth42,
  HttpResend2FA,
  HttpSignIn,
  HttpSignUp,
} from 'src/shared/HttpEndpoints/auth';
import {Request, Response} from 'express';
import {Auth2FADto} from './dto/Auth2fa.dto';
import {Resend2FADto} from './dto/Resend2fa.dto';
import {UserPrivateProfile} from 'src/shared/HttpEndpoints/interfaces';

@Controller(HttpAuth.endPointBase)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get(HttpAuth42.endPoint)
  @UseGuards(FortyTwoAuthGuard)
  redirectTo42Auth(): never {
    throw new UnauthorizedException('Should not be here');
  }

  @Get(HttpAuth42.endPoint_CB)
  @UseGuards(FortyTwoAuthGuard)
  async handle42Callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const {auth2FACode, userId} = await this.authService.handle42Callback(
      req.user as UserPrivateProfile,
    );
    res.redirect(`http://localhost:3000/auth/?auth2FACode=${auth2FACode}&userId=${userId}`);
  }

  @Post(HttpSignUp.endPoint)
  async signup(@Body() dto: SignUpDto): Promise<HttpSignUp.resTemplate> {
    const resBody = await this.authService.signup(dto);
    return new HttpSignUp.resTemplate(resBody);
  }

  @Post(HttpSignIn.endPoint)
  async signin(@Body() dto: SignInDto): Promise<HttpSignIn.resTemplate> {
    return await this.authService.signin(dto);
  }

  @Post(Http2FA.endPoint)
  async verify2FA(@Body() dto: Auth2FADto): Promise<Http2FA.resTemplate> {
    return await this.authService.verify2fa(dto);
  }

  @Post(HttpResend2FA.endPoint)
  async resend2FA(@Body() dto: Resend2FADto): Promise<void> {
    await this.authService.resend2FA(dto);
  }
}
