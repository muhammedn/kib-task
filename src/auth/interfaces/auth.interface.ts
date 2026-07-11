export interface CurrentUserPayload {
  userId?: number;
  userKey: string;
  email: string;
  refreshToken?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
