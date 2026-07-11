import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  it('findByEmail successfully', async () => {
    const user = { id: 1, email: 'a@b.com' };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findByEmail('a@b.com')).resolves.toBe(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
    });
  });

  it('findByKey successfully', async () => {
    const user = { id: 1, key: 'uuid' };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findByKey('uuid')).resolves.toBe(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { key: 'uuid' },
    });
  });

  it('create user successfully', async () => {
    const user = { id: 1, email: 'a@b.com', password: 'hash' };
    prisma.user.create.mockResolvedValue(user);

    await expect(service.create('a@b.com', 'hash')).resolves.toBe(user);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'a@b.com', password: 'hash' },
    });
  });

  it('updateRefreshToken successfully', async () => {
    const user = { id: 1, key: 'uuid', refreshToken: 'hash' };
    prisma.user.update.mockResolvedValue(user);

    await expect(service.updateRefreshToken('uuid', 'hash')).resolves.toBe(user);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { key: 'uuid' },
      data: { refreshToken: 'hash' },
    });
  });
});
