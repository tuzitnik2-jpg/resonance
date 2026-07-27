import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ImagesService } from "./images.service";

interface SetImageBody {
  data: string; // base64 (no data: prefix)
  mimeType: string;
}

@Controller("images")
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  // Public so plain <img> tags render (they don't send the auth header); the image itself is a
  // cover picture, not sensitive. Reads are harmless; writes below stay authenticated.
  @Public()
  @Get(":entityType/:id")
  async get(
    @Param("entityType") entityType: string,
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    ImagesService.assertEntity(entityType);
    const image = await this.images.getImage(entityType, id);
    if (!image) throw new NotFoundException("no image");
    res.setHeader("Content-Type", image.mimeType);
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(image.data);
  }

  @Post(":entityType/:id/suggest")
  async suggest(
    @Param("entityType") entityType: string,
    @Param("id") id: string,
    @Query("artist") artist: string,
    @Query("title") title: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ applied: boolean }> {
    ImagesService.assertEntity(entityType);
    if (!artist?.trim()) throw new BadRequestException("artist is required");
    return this.images.suggestImage(entityType, id, artist.trim(), title?.trim(), user);
  }

  @Put(":entityType/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async set(
    @Param("entityType") entityType: string,
    @Param("id") id: string,
    @Body() body: SetImageBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    ImagesService.assertEntity(entityType);
    await this.images.setImage(entityType, id, body?.data ?? "", body?.mimeType ?? "", user);
  }

  @Delete(":entityType/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(
    @Param("entityType") entityType: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    ImagesService.assertEntity(entityType);
    await this.images.clearImage(entityType, id, user);
  }
}
