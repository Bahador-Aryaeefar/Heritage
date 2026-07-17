import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const buildService = async (queryRaw: jest.Mock) => {
    const moduleRef = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
    }).compile();
    return moduleRef.get(HealthService);
  };

  it('reports ok when the database responds', async () => {
    const service = await buildService(jest.fn().mockResolvedValue([{ '?column?': 1 }]));
    await expect(service.check()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('throws 503 when the database is unreachable', async () => {
    const service = await buildService(jest.fn().mockRejectedValue(new Error('down')));
    await expect(service.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
