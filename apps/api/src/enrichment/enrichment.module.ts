import { Module } from "@nestjs/common";
import { EnrichmentController } from "./enrichment.controller";
import { MusicBrainzService } from "./musicbrainz.service";
import { SpotifyService } from "./spotify.service";

@Module({
  controllers: [EnrichmentController],
  providers: [MusicBrainzService, SpotifyService],
})
export class EnrichmentModule {}
