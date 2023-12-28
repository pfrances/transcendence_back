import {Module} from '@nestjs/common';
import {UserController} from './user.controller';
import {UserService} from './user.service';
import {HashManagerModule} from 'src/hashManager/hashManager.module';
import {ImageModule} from 'src/image/image.module';

@Module({
  imports: [HashManagerModule, ImageModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
