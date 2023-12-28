import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {JwtAuthGuard} from 'src/auth/guard';
import {EditUserDto} from './dto';
import {UserService} from './user.service';
import {GetInfoFromJwt} from 'src/decorator';
import {HttpAllUsers, HttpEditMe, HttpGetMe, HttpUser} from 'src/shared/HttpEndpoints/user';
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
}
