import {Module} from '@nestjs/common';
import {HashManagerService} from './hashManager.service';

@Module({
  providers: [HashManagerService],
  exports: [HashManagerService],
})
export class HashManagerModule {}
