import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@heritage/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};
