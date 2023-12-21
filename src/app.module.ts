import {Module} from '@nestjs/common';
import {AuthModule} from './auth/auth.module';
import {PrismaModule} from './prisma/prisma.module';
import {UserModule} from './user/user.module';
import {ChatModule} from './chat/chat.module';
import {InvitationModule} from './invitation/invitation.module';
import {WebSocketModule} from './webSocket/websocket.module';
import {FriendModule} from './friend/friend.module';
import {WsSocketModule} from './webSocket/WsSocket/WsSocket.module';
import {WsConnectionModule} from './webSocket/WsConnection/WsConnection.module';
import {JwtModule} from './jwt/jwt.module';
import {ImageModule} from './image/image.module';
import {HashManagerModule} from './hashManager/hashManager.module';
// import {MailModule} from './mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    WebSocketModule,
    WsSocketModule,
    WsConnectionModule,
    AuthModule,
    UserModule,
    ChatModule,
    InvitationModule,
    FriendModule,
    JwtModule,
    ImageModule,
    HashManagerModule,
    //MailModule,
  ],
})
export class AppModule {}
