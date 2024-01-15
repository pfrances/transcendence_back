import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {JwtAuthGuard} from 'src/auth/guard';
import {EditUserDto} from './dto';
import {UserService} from './user.service';
import {GetInfoFromJwt} from 'src/decorator';
import {
  HttpAllUsers,
  HttpBlockUser,
  HttpEditMe,
  HttpGetMe,
  HttpGetUser,
  HttpUnblockUser,
  HttpUser,
} from 'src/shared/HttpEndpoints/user';
import {FileInterceptor} from '@nestjs/platform-express';

@Controller(HttpUser.endPointBase)
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(HttpGetMe.endPoint)
  async getMe(@GetInfoFromJwt('userId') userId: number): Promise<HttpGetMe.resTemplate> {
    return await this.userService.getUserPrivateInfo({userId});
  }

  @Get(HttpAllUsers.endPoint)
  async getAllUsers(): Promise<HttpAllUsers.resTemplate> {
    const users = await this.userService.getAllUsersPublicInfo();
    return new HttpAllUsers.resTemplate(users);
  }

  @Get(HttpGetUser.endPoint)
  async getUser(
    @GetInfoFromJwt('userId') userId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<HttpGetUser.resTemplate> {
    return await this.userService.getUserPublicInfoRegardingMe(userId, targetUserId);
  }

  @UseInterceptors(FileInterceptor('avatar'))
  @Patch(HttpEditMe.endPoint)
  async editProfile(
    @GetInfoFromJwt('userId') userId: number,
    @Body() dto: EditUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({maxSize: 1024 * 1024}),
          new FileTypeValidator({fileType: 'image/*'}),
        ],
        fileIsRequired: false,
      }),
    )
    avatar: Express.Multer.File,
  ): Promise<HttpEditMe.resTemplate> {
    if (avatar) dto.avatar = avatar;
    if (!Object.keys(dto).length) throw new UnprocessableEntityException('no data to update');
    return await this.userService.editUserInfo({userId}, dto);
  }

  @Post(HttpBlockUser.endPoint)
  async blockUser(
    @GetInfoFromJwt('userId') userId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<HttpBlockUser.resTemplate> {
    await this.userService.blockUser(userId, targetUserId);
    return {};
  }

  @Delete(HttpUnblockUser.endPoint)
  async unblockUser(
    @GetInfoFromJwt('userId') userId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<HttpUnblockUser.resTemplate> {
    await this.userService.unblockUser(userId, targetUserId);
    return {};
  }
}
