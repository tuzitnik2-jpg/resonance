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
import {
  attachTagSchema,
  createSongSchema,
  generateSongAnalysisSchema,
  proposeSongAnalysisSchema,
  searchSongsQuerySchema,
  updateSongSchema,
  updateSongUserDataSchema,
} from "@resonance/domain";
import type {
  AttachTagInput,
  CreateSongInput,
  GenerateSongAnalysisInput,
  ProposeSongAnalysisInput,
  SearchSongsQuery,
  UpdateSongInput,
  UpdateSongUserDataInput,
} from "@resonance/domain";
import { AnalysesService } from "../analyses/analyses.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SongsService } from "./songs.service";

@Controller("songs")
export class SongsController {
  constructor(
    private readonly songsService: SongsService,
    private readonly analysesService: AnalysesService,
  ) {}

  @Get()
  findAll(
    @Query(new ZodValidationPipe(searchSongsQuerySchema)) query: SearchSongsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.songsService.findAll(query, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.songsService.findOne(id, user);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createSongSchema)) body: CreateSongInput,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.songsService.create(body, user);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result;
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSongSchema)) body: UpdateSongInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.songsService.update(id, body, user);
  }

  @Patch(":id/user-data")
  updateUserData(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSongUserDataSchema)) body: UpdateSongUserDataInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.songsService.updateUserData(id, body, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.songsService.remove(id, user);
  }

  @Post(":id/tags")
  attachTag(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(attachTagSchema)) body: AttachTagInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.songsService.attachTag(id, body.tagId, user);
  }

  @Delete(":id/tags/:tagId")
  detachTag(
    @Param("id") id: string,
    @Param("tagId") tagId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.songsService.detachTag(id, tagId, user);
  }

  @Get(":id/analyses")
  findAnalyses(@Param("id") id: string) {
    return this.analysesService.findAllForSong(id);
  }

  @Post(":id/analyses")
  proposeAnalysis(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(proposeSongAnalysisSchema)) body: ProposeSongAnalysisInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysesService.propose(id, body, user);
  }

  @Post(":id/analyses/generate")
  generateAnalysis(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(generateSongAnalysisSchema)) body: GenerateSongAnalysisInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysesService.generate(id, body.analysisType, user);
  }
}
