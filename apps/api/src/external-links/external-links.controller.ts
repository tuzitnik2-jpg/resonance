import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { createExternalLinkSchema } from "@resonance/domain";
import type { CreateExternalLinkInput } from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ExternalLinksService } from "./external-links.service";

@Controller("external-links")
export class ExternalLinksController {
  constructor(private readonly externalLinksService: ExternalLinksService) {}

  @Get()
  findAll(@Query("entityType") entityType?: string, @Query("entityId") entityId?: string) {
    return this.externalLinksService.findAll(entityType, entityId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createExternalLinkSchema)) body: CreateExternalLinkInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalLinksService.create(body, user);
  }

  @Post(":id/verify")
  verify(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.externalLinksService.verify(id, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.externalLinksService.remove(id, user);
  }
}
