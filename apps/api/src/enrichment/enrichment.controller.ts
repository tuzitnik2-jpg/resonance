import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { MusicBrainzService } from "./musicbrainz.service";
import { SpotifyService } from "./spotify.service";

@Controller("enrichment")
export class EnrichmentController {
  constructor(
    private readonly musicBrainz: MusicBrainzService,
    private readonly spotify: SpotifyService,
  ) {}

  @Get("musicbrainz/search")
  search(@Query("query") query: string) {
    return this.musicBrainz.searchArtists(query);
  }

  @Post("musicbrainz/artists/:artistId")
  enrichArtist(@Param("artistId") artistId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.musicBrainz.enrichArtist(artistId, user);
  }

  @Get("spotify/status")
  spotifyStatus() {
    return { configured: this.spotify.isConfigured() };
  }
}
