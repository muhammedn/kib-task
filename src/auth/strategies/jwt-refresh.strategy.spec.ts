import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('refresh-secret') },
        },
      ],
    }).compile();

    strategy = module.get(JwtRefreshStrategy);
  });

  it('returns user payload with refresh token from Authorization header', () => {
    const req = {
      get: jest.fn().mockReturnValue('Bearer refresh-token-value'),
    } as unknown as Request;

    expect(
      strategy.validate(req, { sub: 'user-key', email: 'test@example.com' }),
    ).toEqual({
      userKey: 'user-key',
      email: 'test@example.com',
      refreshToken: 'refresh-token-value',
    });
  });

  it('handles missing Authorization header', () => {
    const req = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;

    expect(
      strategy.validate(req, { sub: 'user-key', email: 'test@example.com' }),
    ).toEqual({
      userKey: 'user-key',
      email: 'test@example.com',
      refreshToken: '',
    });
  });
});
