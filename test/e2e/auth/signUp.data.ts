import {HttpSignUp} from '../../../src/shared/HttpEndpoints/auth';

export const signUpData: HttpSignUp.reqTemplate[] = [
  {email: 'test@gmail.com', password: 'test', nickname: 'test'},
  {email: 'test@gmail.com', password: 'test', nickname: 'test2'},
  {email: 'test@gmail.com', password: 'test', nickname: 'test1'},
  {email: 'testgmail.com', password: 'test', nickname: 'test2'},
  {email: 'test@gmail.com', password: '', nickname: 'test'},
  {email: 'test@gmail.com', password: 'test', nickname: 'test1'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
  {email: 'glehogheoghe@hotmailcom', password: 'test', nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
];
