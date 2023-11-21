import {HttpSignIn} from '../../../src/shared/HttpEndpoints/auth';

export const signInData: HttpSignIn.reqTemplate[] = [
  {nickname: 'test1', password: 'test1'},
  {nickname: 'test1', password: 'test1'},
  {nickname: 'test2', password: ''},
  {nickname: 'test2', password: 'test1'},
  {nickname: 'test2', password: 'test2'},
  {nickname: 'test2', password: 'test2'},
  {nickname: '', password: ''},
  {nickname: 'test3', password: 'test'},
  {nickname: 'test4', password: 'test4'},
  {nickname: '', password: 'test2'},
  {nickname: 'test4', password: 'test44'},
];
