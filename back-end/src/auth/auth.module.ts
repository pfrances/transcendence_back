import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {JwtModule} from '@nestjs/jwt';
import {PassportModule} from '@nestjs/passport';
import {AuthController} from './auth.controller';
import {FortyTwoStrategy, JwtStrategy} from './strategy';
import {UserModule} from 'src/user/user.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_KEY,
      signOptions: {expiresIn: '1d'},
    }),
    PassportModule,
    UserModule,
  ],
  providers: [FortyTwoStrategy, JwtStrategy, AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
