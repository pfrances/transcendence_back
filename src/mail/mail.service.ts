import {MailerService} from '@nestjs-modules/mailer';
import {Injectable} from '@nestjs/common';
import {SendingMailInterface} from './interface/mail.interface';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(user: SendingMailInterface, code: string) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Transcendance - Please confirm your authentication',
      template: './auth_2FA',
      context: {
        name: user.nickname,
        code,
      },
    });
  }
}
