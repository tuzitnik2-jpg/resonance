import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AIProviderUnavailableError, createAIProvider, type AIProvider } from "@resonance/ai";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

@Injectable()
export class AssistantService {
  private readonly provider: AIProvider = createAIProvider();

  constructor(private readonly prisma: PrismaService) {}

  async ask(question: string, user: AuthenticatedUser): Promise<{ answer: string }> {
    const songs = await this.prisma.song.findMany({
      where: { deletedAt: null },
      include: {
        primaryArtist: true,
        songTags: { include: { tag: true } },
        userData: { where: { userId: user.userId } },
      },
      take: 300,
      orderBy: { title: "asc" },
    });

    const libraryContext = songs
      .map((s) => {
        const tags = s.songTags.map((t) => t.tag.name).join(", ");
        const ud = s.userData[0];
        const bits = [
          `"${s.title}" by ${s.primaryArtist?.canonicalName ?? "?"}`,
          s.releaseYear ? `(${s.releaseYear})` : "",
          tags ? `tags: ${tags}` : "",
          ud?.rating ? `rated ${ud.rating}/10` : "",
          ud?.favorite ? "favorite" : "",
        ].filter(Boolean);
        return bits.join(" · ");
      })
      .join("\n");

    try {
      const answer = await this.provider.answer({ question, libraryContext });
      return { answer };
    } catch (err) {
      if (err instanceof AIProviderUnavailableError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }
}
