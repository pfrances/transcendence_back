import {Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtTokenPayload} from './interface';
import {SignInDto, SignUpDto} from './dto';
import {UserService} from 'src/user/user.service';
import {WsException} from '@nestjs/websockets';
import {HttpSignUp} from 'src/shared/HttpEndpoints/auth';
import {JwtService} from 'src/jwt/jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
  ) {}

  async createAuthToken(tokenData: JwtTokenPayload): Promise<string> {
    return await this.jwt.createAuthToken(tokenData);
  }

  async signup(dto: SignUpDto): Promise<HttpSignUp.resTemplate> {
    return await this.userService.createUser(dto);
  }

  async signin(dto: SignInDto): Promise<string> {
    const jwtPayload = await this.userService.verifyUserCredential(dto);
    return await this.jwt.createAuthToken(jwtPayload);
  }
}
