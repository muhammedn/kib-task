import { UserRole } from '../../generated/prisma/client';

export interface CurrentUserPayload {
  userId?: number;
  userKey: string;
  email: string;
  role?: UserRole;
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
