import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { CurrentUserPayload } from './interfaces/auth.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    logout: jest.Mock;
    refreshTokens: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('register user successfully', () => {
    const dto = { email: 'a@b.com', password: 'pass' };
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    authService.register.mockReturnValue(tokens);

    expect(controller.register(dto)).toBe(tokens);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login user successfully', () => {
    const dto = { email: 'a@b.com', password: 'pass' };
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    authService.login.mockReturnValue(tokens);

    expect(controller.login(dto)).toBe(tokens);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('logout user successfully', () => {
    const user: CurrentUserPayload = {
      userKey: 'key',
      email: 'a@b.com',
    };
    authService.logout.mockReturnValue({ message: 'Logged out successfully' });

    expect(controller.logout(user)).toEqual({
      message: 'Logged out successfully',
    });
    expect(authService.logout).toHaveBeenCalledWith('key');
  });

  it('refresh user tokens successfully', () => {
    const user: CurrentUserPayload = {
      userKey: 'key',
      email: 'a@b.com',
      refreshToken: 'refresh',
    };
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    authService.refreshTokens.mockReturnValue(tokens);

    expect(controller.refresh(user)).toBe(tokens);
    expect(authService.refreshTokens).toHaveBeenCalledWith('key', 'refresh');
  });
});
