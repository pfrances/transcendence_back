import {Injectable} from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashManagerService {
  async hash(plainText: string): Promise<string> {
    return argon2.hash(plainText);
  }

  async verify(
    plainText: string | null | undefined,
    hash: string | null | undefined,
  ): Promise<boolean> {
    if (!hash) return plainText ? false : true;
    if (!plainText) return false;
    return argon2.verify(hash, plainText);
  }
}
