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
import { createMemorySchema, updateMemorySchema } from "@resonance/domain";
import type { CreateMemoryInput, UpdateMemoryInput } from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { MemoriesService } from "./memories.service";

@Controller("memories")
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
  ) {
    return this.memoriesService.findAll(user, { entityType, entityId });
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.memoriesService.findOne(id, user);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createMemorySchema)) body: CreateMemoryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memoriesService.create(body, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMemorySchema)) body: UpdateMemoryInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memoriesService.update(id, body, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.memoriesService.remove(id, user);
  }
}
