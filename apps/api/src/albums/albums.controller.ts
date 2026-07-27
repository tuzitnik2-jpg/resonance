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
import { attachTagSchema, createAlbumSchema, updateAlbumSchema } from "@resonance/domain";
import type { AttachTagInput, CreateAlbumInput, UpdateAlbumInput } from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AlbumsService } from "./albums.service";

@Controller("albums")
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get()
  findAll(
    @Query("artistId") artistId?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.albumsService.findAll({
      artistId,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.albumsService.findOne(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createAlbumSchema)) body: CreateAlbumInput,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.albumsService.create(body, user);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result;
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateAlbumSchema)) body: UpdateAlbumInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.albumsService.update(id, body, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.albumsService.remove(id, user);
  }

  @Post(":id/tags")
  attachTag(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(attachTagSchema)) body: AttachTagInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.albumsService.attachTag(id, body.tagId, user);
  }

  @Delete(":id/tags/:tagId")
  @HttpCode(HttpStatus.NO_CONTENT)
  detachTag(
    @Param("id") id: string,
    @Param("tagId") tagId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.albumsService.detachTag(id, tagId, user);
  }
}
