import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../prisma/prisma.service";

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

const SESSION_COOKIE_NAME = "resonance_session";

@Injectable()
export class AuthGuard implements CanActivate {
  // Login is intentionally disabled: this is a single-user personal archive, so every request runs
  // as the one account in the database. A valid session cookie / bearer token is still honored (the
  // MCP connector mints one), but its ABSENCE now falls back to that default user instead of a 401.
  // The default user is resolved once from the DB and cached for the process lifetime.
  private defaultUser: AuthenticatedUser | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveDefaultUser(): Promise<AuthenticatedUser> {
    if (this.defaultUser) return this.defaultUser;
    const user = await this.prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) {
      throw new UnauthorizedException("No user exists in this archive yet.");
    }
    this.defaultUser = { userId: user.id, email: user.email };
    return this.defaultUser;
  }

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

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
        request.user = { userId: payload.userId, email: payload.email };
        return true;
      } catch {
        // Ignore an invalid/expired token and fall back to the default user below.
      }
    }

    request.user = await this.resolveDefaultUser();
    return true;
  }
}

export { SESSION_COOKIE_NAME };
