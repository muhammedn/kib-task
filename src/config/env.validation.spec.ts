import 'reflect-metadata';
import { validate } from './env.validation';

describe('env.validation', () => {
  const validConfig = {
    PORT: 3000,
    NODE_ENV: 'development',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
  };

  it('returns validated config when required fields are present', () => {
    const result = validate(validConfig);

    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
    expect(result.JWT_ACCESS_SECRET).toBe('access-secret');
    expect(result.JWT_REFRESH_SECRET).toBe('refresh-secret');
  });

  it('throws when JWT_ACCESS_SECRET is missing', () => {
    expect(() =>
      validate({
        ...validConfig,
        JWT_ACCESS_SECRET: '',
      }),
    ).toThrow();
  });

  it('throws when JWT_REFRESH_SECRET is missing', () => {
    expect(() =>
      validate({
        ...validConfig,
        JWT_REFRESH_SECRET: '',
      }),
    ).toThrow();
  });

  it('throws when NODE_ENV is invalid', () => {
    expect(() =>
      validate({
        ...validConfig,
        NODE_ENV: 'staging',
      }),
    ).toThrow();
  });
});
