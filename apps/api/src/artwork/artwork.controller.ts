import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ArtworkService, type ArtworkType } from "./artwork.service";

const TYPES: ArtworkType[] = ["song", "album", "artist"];

@Controller("artwork")
export class ArtworkController {
  constructor(private readonly artwork: ArtworkService) {}

  @Get()
  async lookup(
    @Query("type") type: string,
    @Query("artist") artist: string,
    @Query("title") title?: string,
  ): Promise<{ imageUrl: string | null }> {
    if (!TYPES.includes(type as ArtworkType)) {
      throw new BadRequestException(`type must be one of ${TYPES.join(", ")}`);
    }
    if (!artist || !artist.trim()) {
      throw new BadRequestException("artist is required");
    }
    const imageUrl = await this.artwork.lookup(type as ArtworkType, artist.trim(), title?.trim());
    return { imageUrl };
  }
}
