import {Controller, Post, UploadedFile, UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {ImageService} from './image.service';

@Controller('upload')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() //   new ParseFilePipe({
    //     validators: [
    file //       new MaxFileSizeValidator({maxSize: 1000}),
    //       new FileTypeValidator({
    //         fileType: 'image/png',
    //       }),
    //     ],
    //   }),
    : Express.Multer.File,
  ) {
    await this.imageService.uploadFile(file.originalname, file.buffer);
  }
}
