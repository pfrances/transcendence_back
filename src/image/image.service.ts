import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {Injectable, InternalServerErrorException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

@Injectable()
export class ImageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly bucketUrl: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.getOrThrow('AWS_REGION');
    const accessKeyId = this.config.getOrThrow('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.getOrThrow('AWS_SECRET_ACCESS_KEY');

    this.s3Client = new S3Client({region, credentials: {accessKeyId, secretAccessKey}});

    this.bucketName = this.config.getOrThrow('AWS_BUCKET_NAME');
    this.bucketUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com`;
  }

  async uploadFile(filename: string, file: Buffer): Promise<string> {
    const key = `${filename}-${Date.now()}`;
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file,
        }),
      );
      return `${this.bucketUrl}/${key}`;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
