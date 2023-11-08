import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import {WsException} from '@nestjs/websockets';
import {plainToClassFromExist} from 'class-transformer';
import {validate} from 'class-validator';

export const WsDtoPipe = createParamDecorator(async (data: any, context: ExecutionContext) => {
  const message = context.switchToWs().getData();
  const dtoClass = data;
  let dtoInstance = Object.assign(new dtoClass(), message);

  const errors = await validate(dtoInstance, {whitelist: true});
  if (errors.length > 0) {
    throw new WsException(errors);
  }
  return plainToClassFromExist(dtoClass, dtoInstance, {});
});
