import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Centralized Prisma error mapping (arch doc §11): every service that touches a
// resource funnels known Prisma errors through this helper so a missing record,
// a broken relation, and a unique-constraint clash always map to the same
// HTTP semantics (404/400/409), regardless of which module raised them.
export function handlePrismaError(error: unknown, resource: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        throw new NotFoundException(`${resource} not found`);
      case 'P2003':
        throw new BadRequestException(`${resource} references a related record that does not exist`);
      case 'P2002':
        throw new ConflictException(`${resource} already exists`);
    }
  }
  throw error;
}
