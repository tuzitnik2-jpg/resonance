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
} from "@nestjs/common";
import {
  addPlaylistItemSchema,
  createPlaylistSchema,
  updatePlaylistSchema,
} from "@resonance/domain";
import type {
  AddPlaylistItemInput,
  CreatePlaylistInput,
  UpdatePlaylistInput,
} from "@resonance/domain";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PlaylistsService } from "./playlists.service";

@Controller("playlists")
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.playlistsService.findAll(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.playlistsService.findOne(id, user);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createPlaylistSchema)) body: CreatePlaylistInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playlistsService.create(body, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlaylistSchema)) body: UpdatePlaylistInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playlistsService.update(id, body, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.playlistsService.remove(id, user);
  }

  @Post(":id/items")
  addItem(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addPlaylistItemSchema)) body: AddPlaylistItemInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playlistsService.addItem(id, body, user);
  }

  @Delete(":id/items/:songId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param("id") id: string,
    @Param("songId") songId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playlistsService.removeItem(id, songId, user);
  }
}
