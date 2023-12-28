import {HttpException, Injectable, UnauthorizedException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {Strategy} from 'passport-42';
import {UserService} from 'src/user/user.service';
import {FortyTwoProfile} from '../interface';
import {UserPrivateProfile} from 'src/shared/HttpEndpoints/interfaces';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42auth') {
  constructor(private readonly userService: UserService) {
    super({
      clientID: process.env.OAUTH42_CLIENT_ID,
      clientSecret: process.env.OAUTH42_SECRET,
      callbackURL: process.env.OAUTH42_REDIRECT_URI,
      scope: 'public',
      profileFields: {
        user42Id: 'id',
        nickname: 'login',
        email: 'email',
      },
    });
  }

  async validate(
    // @ts-ignore
    accessToken: string,
    // @ts-ignore
    refreshToken: string,
    profile: FortyTwoProfile,
  ): Promise<UserPrivateProfile> {
    const {user42Id, email, nickname} = profile;
    if (!profile || !user42Id || !email || !nickname)
      throw new UnauthorizedException('Unable to get 42 data.');
    try {
      return await this.userService.getOrCreateUser({user42Id}, {user42Id, email, nickname}, true);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new UnauthorizedException(err);
    }
  }
}
