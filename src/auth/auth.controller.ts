import {Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards} from '@nestjs/common';
import {AuthService} from './auth.service';
import {FortyTwoAuthGuard, JwtAuthGuard} from './guard';
import {SignInDto, SignUpDto} from './dto';
import {HttpAuth, HttpAuth42, HttpSignIn, HttpSignUp} from 'src/shared/HttpEndpoints/auth';

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
  async handle42Callback(@Req() req): Promise<HttpAuth.Auth42.resTemplate> {
    const authToken = await this.authService.createAuthToken(req.user);
    return {authToken};
  }

  @Post(HttpSignUp.endPoint)
  async signup(@Body() dto: SignUpDto): Promise<HttpSignUp.resTemplate> {
    return this.authService.signup(dto);
  }

  @Post(HttpSignIn.endPoint)
  async signin(@Body() dto: SignInDto): Promise<HttpSignIn.resTemplate> {
    const authToken = await this.authService.signin(dto);
    return {authToken};
  }

  @Get('test')
  @UseGuards(JwtAuthGuard)
  async test(): Promise<string> {
    return 'test';
  }
}
