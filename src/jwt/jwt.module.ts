import {Global, Module} from '@nestjs/common';
import {JwtService} from './jwt.service';
import {JwtModule as Jwt} from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    Jwt.register({
      secret: process.env.JWT_KEY,
      signOptions: {expiresIn: '1h'},
      verifyOptions: {ignoreExpiration: false},
    }),
  ],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
