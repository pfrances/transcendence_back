import {JwtData} from '../../shared/HttpEndpoints/types';

export interface RefreshJwt {
  authToken: JwtData;
  refreshToken: JwtData;
}
