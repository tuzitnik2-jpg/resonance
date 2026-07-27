import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { LookupService } from "./lookup.service";

@Controller("lookup")
export class LookupController {
  constructor(private readonly lookup: LookupService) {}

  @Get("preview")
  async preview(
    @Query("artist") artist: string,
    @Query("title") title: string,
  ): Promise<{ previewUrl: string | null }> {
    if (!artist?.trim() || !title?.trim()) {
      throw new BadRequestException("artist and title are required");
    }
    return { previewUrl: await this.lookup.previewUrl(artist.trim(), title.trim()) };
  }
}
