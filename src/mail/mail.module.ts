import {MailerModule} from '@nestjs-modules/mailer';
import {HandlebarsAdapter} from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import {Module} from '@nestjs/common';
import {MailService} from './mail.service';
import {join} from 'path';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        secure: false,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      defaults: {
        from: process.env.SMTP_SENDER,
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
