import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { analyzeImportSchema } from "@resonance/domain";
import type { AnalyzeImportInput } from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ImportsService } from "./imports.service";

@Controller("imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  analyze(
    @Body(new ZodValidationPipe(analyzeImportSchema)) body: AnalyzeImportInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importsService.analyze(body, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.importsService.findOne(id);
  }

  @Post(":id/commit")
  commit(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.importsService.commit(id, user);
  }
}
