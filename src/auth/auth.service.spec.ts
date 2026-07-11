import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findByKey: jest.Mock;
    create: jest.Mock;
    updateRefreshToken: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let configService: { getOrThrow: jest.Mock; get: jest.Mock };

  const mockUser = {
    id: 1,
    key: 'user-key',
    email: 'test@example.com',
    password: 'hashed-password',
    refreshToken: 'hashed-refresh',
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByKey: jest.fn(),
      create: jest.fn(),
      updateRefreshToken: jest.fn(),
    };
    jwtService = { signAsync: jest.fn() };
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        return '';
      }),
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        if (key === 'admin.email') return '';
        return undefined;
      }),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersService.create).toHaveBeenCalledWith(
        'test@example.com',
        'hashed',
        UserRole.USER,
      );
    });

    it('registers admin when email matches ADMIN_EMAIL', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'admin.email') return 'admin@example.com';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      });
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        ...mockUser,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.register({
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        'admin@example.com',
        'hashed',
        UserRole.ADMIN,
      );
    });

    it('throws an error when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('logs in user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
    });

    it('throws an error when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws an error when password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('logs out user successfully', async () => {
      usersService.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.logout('user-key');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-key',
        null,
      );
    });
  });

  describe('refreshTokens', () => {
    it('refreshes user tokens successfully', async () => {
      usersService.findByKey.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshTokens('user-key', 'refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });

    it('throws an error when user not found', async () => {
      usersService.findByKey.mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-key', 'refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws an error when user has no refresh token', async () => {
      usersService.findByKey.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(
        service.refreshTokens('user-key', 'refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws an error when refresh token does not match', async () => {
      usersService.findByKey.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-key', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens', () => {
    it('uses default token expiry when config values are not set', async () => {
      configService.get.mockReturnValue(undefined);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '7d' }),
      );
    });
  });
});
