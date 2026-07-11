import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Tokens } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<Tokens> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const adminEmail = this.config.get<string>('admin.email')?.toLowerCase();
    const role =
      adminEmail && dto.email.toLowerCase() === adminEmail
        ? UserRole.ADMIN
        : UserRole.USER;
    const user = await this.usersService.create(
      dto.email,
      hashedPassword,
      role,
    );

    return this.generateTokens(user.key, user.email);
  }

  async login(dto: LoginDto): Promise<Tokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.key, user.email);
  }

  async logout(userKey: string) {
    await this.usersService.updateRefreshToken(userKey, null);
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userKey: string, refreshToken: string): Promise<Tokens> {
    const user = await this.usersService.findByKey(userKey);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access denied');
    }

    return this.generateTokens(user.key, user.email);
  }

  private async signToken(
    payload: { sub: string; email: string },
    secret: string,
    expiresIn: JwtSignOptions['expiresIn'],
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn,
    });
  }

  private async generateTokens(
    userKey: string,
    email: string,
  ): Promise<Tokens> {
    const payload = { sub: userKey, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(
        payload,
        this.config.getOrThrow('JWT_ACCESS_SECRET'),
        this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      ),
      this.signToken(
        payload,
        this.config.getOrThrow('JWT_REFRESH_SECRET'),
        this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      ),
    ]);

    await this.usersService.updateRefreshToken(
      userKey,
      await bcrypt.hash(refreshToken, 10),
    );

    return { accessToken, refreshToken };
  }
}
