import {BadRequestException} from '@nestjs/common';

export class NotInEnumException extends BadRequestException {
  constructor(value: unknown, enumObject: Record<string, unknown>) {
    const enumValues = Object.values(enumObject)
      .filter(item => {
        return isNaN(Number(item));
      })
      .join(' | ');
    super(`The value '${value}' has to be one of [${enumValues}]`);
  }
}
