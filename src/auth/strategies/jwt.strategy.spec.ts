import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/client';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findByKey: jest.Mock };

  beforeEach(async () => {
    usersService = { findByKey: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('access-secret') },
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('returns user payload when user exists', async () => {
    usersService.findByKey.mockResolvedValue({
      id: 1,
      key: 'user-key',
      email: 'test@example.com',
      role: UserRole.ADMIN,
    });

    await expect(
      strategy.validate({ sub: 'user-key', email: 'test@example.com' }),
    ).resolves.toEqual({
      userId: 1,
      userKey: 'user-key',
      email: 'test@example.com',
      role: UserRole.ADMIN,
    });
  });

  it('throws an error when user not found', async () => {
    usersService.findByKey.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing', email: 'test@example.com' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
