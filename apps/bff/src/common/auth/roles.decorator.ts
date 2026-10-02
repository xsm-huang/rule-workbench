import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@rule-workbench/contracts';

export const REQUIRED_ROLES_KEY = 'required_roles';

/** 自定义装饰器，添加 metadata */
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
