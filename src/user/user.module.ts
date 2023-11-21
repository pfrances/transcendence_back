import {Module} from '@nestjs/common';
import {UserController} from './user.controller';
import {UserService} from './user.service';
import {HashManagerModule} from 'src/hashManager/hashManager.module';

@Module({
  imports: [HashManagerModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
