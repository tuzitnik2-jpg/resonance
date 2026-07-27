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
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { createArtistSchema, updateArtistSchema } from "@resonance/domain";
import type { CreateArtistInput, UpdateArtistInput } from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ArtistsService } from "./artists.service";

@Controller("artists")
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  findAll(
    @Query("query") query?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.artistsService.findAll({
      query,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.artistsService.findOne(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createArtistSchema)) body: CreateArtistInput,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.artistsService.create(body, user);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result;
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateArtistSchema)) body: UpdateArtistInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artistsService.update(id, body, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.artistsService.remove(id, user);
  }
}
