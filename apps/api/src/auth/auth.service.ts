import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return user;
  }

  async issueSessionToken(user: { id: string; email: string }): Promise<string> {
    return this.jwtService.signAsync({ userId: user.id, email: user.email });
  }

  /**
   * Mints a bearer token for the MCP server / other machine clients (ADR-0005: MVP uses a
   * single shared bearer token rather than full OAuth 2.1 — see docs/adr/0011).
   */
  async issueMcpToken(user: {
    id: string;
    email: string;
  }): Promise<{ token: string; expiresIn: string }> {
    const expiresIn = process.env.MCP_TOKEN_EXPIRES_IN ?? "7d";
    const token = await this.jwtService.signAsync(
      { userId: user.id, email: user.email },
      { expiresIn },
    );
    return { token, expiresIn };
  }
}
