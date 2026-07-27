import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { createTagSchema, updateTagSchema } from "@resonance/domain";
import type { CreateTagInput, UpdateTagInput } from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { TagsService } from "./tags.service";

@Controller("tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(@Query("category") category?: string) {
    return this.tagsService.findAll(category);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.tagsService.findOne(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createTagSchema)) body: CreateTagInput) {
    return this.tagsService.create(body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTagSchema)) body: UpdateTagInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.update(id, body, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tagsService.remove(id, user);
  }
}
