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
import {
  createFestivalPerformanceSchema,
  createFestivalSchema,
  updateFestivalPerformanceSchema,
  updateFestivalSchema,
} from "@resonance/domain";
import type {
  CreateFestivalInput,
  CreateFestivalPerformanceInput,
  UpdateFestivalInput,
  UpdateFestivalPerformanceInput,
} from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FestivalsService } from "./festivals.service";

@Controller("festivals")
export class FestivalsController {
  constructor(private readonly festivalsService: FestivalsService) {}

  @Get()
  findAll(@Query("limit") limit?: string, @Query("cursor") cursor?: string) {
    return this.festivalsService.findAll({ limit: limit ? Number(limit) : undefined, cursor });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.festivalsService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createFestivalSchema)) body: CreateFestivalInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.festivalsService.create(body, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFestivalSchema)) body: UpdateFestivalInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.festivalsService.update(id, body, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.festivalsService.remove(id, user);
  }

  @Post(":id/performances")
  addPerformance(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createFestivalPerformanceSchema))
    body: CreateFestivalPerformanceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.festivalsService.addPerformance(id, body, user);
  }

  @Patch(":id/performances/:performanceId")
  updatePerformance(
    @Param("id") id: string,
    @Param("performanceId") performanceId: string,
    @Body(new ZodValidationPipe(updateFestivalPerformanceSchema))
    body: UpdateFestivalPerformanceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.festivalsService.updatePerformance(id, performanceId, body, user);
  }

  @Delete(":id/performances/:performanceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removePerformance(
    @Param("id") id: string,
    @Param("performanceId") performanceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.festivalsService.removePerformance(id, performanceId, user);
  }
}
