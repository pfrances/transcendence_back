import {Injectable} from '@nestjs/common';
import {JwtTokenPayload} from './interface';
import {SignInDto, SignUpDto} from './dto';
import {UserService} from 'src/user/user.service';
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
    const userInfo = await this.userService.createUser(dto);
    const authToken = await this.createAuthToken(userInfo);
    return {...userInfo, authToken};
  }

  async signin(dto: SignInDto): Promise<string> {
    const jwtPayload = await this.userService.verifyUserCredential(dto);
    return await this.createAuthToken(jwtPayload);
  }
}
