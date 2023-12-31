import {Injectable} from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashManagerService {
  async hash(plainText: string): Promise<string> {
    return argon2.hash(plainText);
  }

  async verify(
    hash: string | null | undefined,
    plainText: string | null | undefined,
  ): Promise<boolean> {
    if (!hash) return plainText ? false : true;
    if (!plainText) return false;
    try {
      return await argon2.verify(hash, plainText);
    } catch (err) {
      return false;
    }
  }
}
