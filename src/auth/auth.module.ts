import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {PassportModule} from '@nestjs/passport';
import {AuthController} from './auth.controller';
import {FortyTwoStrategy, JwtStrategy} from './strategy';
import {UserModule} from 'src/user/user.module';
import {MailModule} from 'src/mail/mail.module';

@Module({
  imports: [PassportModule, UserModule, MailModule],
  providers: [FortyTwoStrategy, JwtStrategy, AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
