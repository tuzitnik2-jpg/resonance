import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  AIProviderUnavailableError,
  buildInstructions,
  createAIProvider,
  DEFAULT_ASSISTANT_INSTRUCTIONS,
} from "@resonance/ai";
import type { AnalysisType } from "@resonance/ai";
import type { ProposeSongAnalysisInput } from "@resonance/domain";
import type { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

const analysisSongInclude = {
  primaryArtist: true,
  album: true,
  songTags: { include: { tag: true } },
} as const;

@Injectable()
export class AnalysesService {
  private readonly aiProvider = createAIProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAllForSong(songId: string) {
    const items = await this.prisma.songAnalysis.findMany({
      where: { songId },
      orderBy: { createdAt: "desc" },
    });
    return { items };
  }

  async findPending() {
    const items = await this.prisma.songAnalysis.findMany({
      where: { status: "DRAFT" },
      include: { song: { include: { primaryArtist: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { items };
  }

  async propose(songId: string, input: ProposeSongAnalysisInput, user: AuthenticatedUser) {
    const song = await this.prisma.song.findFirst({ where: { id: songId, deletedAt: null } });
    if (!song) {
      throw new NotFoundException(`Song ${songId} not found.`);
    }

    const analysis = await this.prisma.songAnalysis.create({
      data: {
        songId,
        analysisType: input.analysisType,
        summary: input.summary,
        contentJson: input.structuredData as Prisma.InputJsonValue,
        source: "AI",
        model: input.model,
        promptVersion: input.promptVersion,
        status: "DRAFT",
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "AI",
      actorId: user.userId,
      action: "create",
      entityType: "song_analysis",
      entityId: analysis.id,
      afterJson: analysis,
    });

    return { analysis, auditEventId };
  }

  /** Calls the configured AIProvider to generate a fresh draft analysis for a song. */
  async generate(songId: string, analysisType: AnalysisType, user: AuthenticatedUser) {
    const song = await this.prisma.song.findFirst({
      where: { id: songId, deletedAt: null },
      include: analysisSongInclude,
    });
    if (!song) {
      throw new NotFoundException(`Song ${songId} not found.`);
    }

    const userData = await this.prisma.songUserData.findUnique({
      where: { userId_songId: { userId: user.userId, songId } },
    });

    const activePrompt = await this.prisma.promptVersion.findFirst({
      where: { name: "resonance_assistant", active: true },
      orderBy: { version: "desc" },
    });

    const instructions = buildInstructions(
      analysisType,
      activePrompt?.instructions ?? DEFAULT_ASSISTANT_INSTRUCTIONS,
    );

    const result = await this.aiProvider
      .analyzeSong({
        analysisType,
        instructions,
        song: {
          title: song.title,
          artistName: song.primaryArtist.canonicalName,
          albumTitle: song.album?.title,
          releaseYear: song.releaseYear ?? undefined,
          existingTags: song.songTags.map((st) => st.tag.name),
          userNote: userData?.userNote ?? undefined,
        },
      })
      .catch((error) => {
        if (error instanceof AIProviderUnavailableError) {
          throw new ServiceUnavailableException(error.message);
        }
        throw error;
      });

    const analysis = await this.prisma.songAnalysis.create({
      data: {
        songId,
        analysisType,
        summary: result.summary,
        contentJson: result.structuredData as Prisma.InputJsonValue,
        source: "AI",
        model: result.model,
        promptVersion: activePrompt ? `${activePrompt.name}:${activePrompt.version}` : "default",
        status: "DRAFT",
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "AI",
      action: "create",
      entityType: "song_analysis",
      entityId: analysis.id,
      afterJson: analysis,
    });

    return { analysis, auditEventId };
  }

  async review(id: string, decision: "approve" | "reject", user: AuthenticatedUser) {
    const existing = await this.prisma.songAnalysis.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Analysis ${id} not found.`);
    }
    if (existing.status !== "DRAFT") {
      throw new BadRequestException(
        `Analysis ${id} has already been ${existing.status.toLowerCase()}.`,
      );
    }

    const analysis = await this.prisma.songAnalysis.update({
      where: { id },
      data: { status: decision === "approve" ? "APPROVED" : "REJECTED" },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: decision,
      entityType: "song_analysis",
      entityId: analysis.id,
      beforeJson: existing,
      afterJson: analysis,
    });

    return { analysis, auditEventId };
  }
}
