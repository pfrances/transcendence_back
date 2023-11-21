import {HttpEditMe} from '../../src/shared/HttpEndpoints/user';

export const editMeData: HttpEditMe.reqTemplate[] = [
  {email: 'test@gmail.com', password: 'testhrhr', nickname: 'test'},
  {email: 'test@gmail.com', password: 'test', nickname: 'test2'},
  {email: 'test@gmail.com', password: 'e', nickname: 'test1'},
  {email: 'testgmail.com', password: '', nickname: 'test2'},
  {email: 'test@gmail.com', password: '', nickname: 'test'},
  {email: 'test@gmail.com', password: 'test', nickname: 'test1'},
  {email: 'glehogheoghe@hotmail.com', nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
  {nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
  {password: 'test', nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
  {email: 'glehogheoghe@hotmail.com', nickname: 'test4'},
  {email: 'glehogheoghe@hotmail.com', password: 'test', nickname: 'test3'},
];
