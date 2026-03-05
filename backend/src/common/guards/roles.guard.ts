import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserModel } from '../../models/User';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Authentication required');

    const dbUser = await UserModel.findById(user.id);
    if (!dbUser) throw new ForbiddenException('User not found');
    if (!dbUser.is_active) throw new ForbiddenException('Account is inactive');

    if (!requiredRoles.includes(dbUser.role)) {
      throw new ForbiddenException('Admin access required');
    }

    // Attach full user to request for admin logging
    request.adminUser = dbUser;
    return true;
  }
}
