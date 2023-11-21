import {Http} from '../../../src/shared/HttpEndpoints';
import * as supertest from 'supertest';

export const testBodyByCtr = <T>(body: any, ctor: new (body: any) => T): body is T => {
  try {
    const instance = new ctor(body);
    for (const key in instance) {
      if (body[key] !== instance[key]) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const validateEmail = email => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    );
};

export interface ICheckHttpEndpoint {
  httpServer: supertest.SuperTest<supertest.Test>;
  endpoint: string;
  method: string;
  jwt?: string;
  status: number;
  reqBody?: Http.reqTemplate;
  resBodyCtor?: new (body: any) => unknown;
}
