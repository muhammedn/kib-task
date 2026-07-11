import { Injectable } from '@nestjs/common';
import { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByKey(key: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { key } });
  }

  create(email: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.create({
      data: { email, password: hashedPassword },
    });
  }

  updateRefreshToken(
    key: string,
    hashedRefreshToken: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { key },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
