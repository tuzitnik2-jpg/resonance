import { Body, Controller, HttpCode, Post, Res, UsePipes } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SESSION_COOKIE_NAME } from "../common/guards/auth.guard";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { AuthService } from "./auth.service";
import { LoginDto, loginSchema } from "./dto/login.dto";

const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ email: string; displayName: string }> {
    const user = await this.authService.validateCredentials(body.email, body.password);
    const token = await this.authService.issueSessionToken(user);

    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });

    return { email: user.email, displayName: user.displayName };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response): { success: true } {
    response.clearCookie(SESSION_COOKIE_NAME);
    return { success: true };
  }

  /**
   * Mints a bearer token to paste into the ChatGPT MCP connector's "Authorization" setting.
   * Requires an existing logged-in session (cookie) — this is an admin action, not exposed
   * over MCP itself.
   */
  @Post("mcp-token")
  @HttpCode(200)
  mcpToken(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.issueMcpToken({ id: user.userId, email: user.email });
  }
}
