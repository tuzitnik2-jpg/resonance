import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

const SESSION_COOKIE_NAME = "resonance_session";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const bearerToken = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = request.cookies?.[SESSION_COOKIE_NAME] ?? bearerToken;

    if (!token) {
      throw new UnauthorizedException("Missing session cookie or bearer token.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      request.user = { userId: payload.userId, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired session.");
    }
  }
}

export { SESSION_COOKIE_NAME };
