import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AlbumsModule } from "./albums/albums.module";
import { AnalysesModule } from "./analyses/analyses.module";
import { ArtistsModule } from "./artists/artists.module";
import { ImagesModule } from "./images/images.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { AuthGuard } from "./common/guards/auth.guard";
import { ContextModule } from "./context/context.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { ExportsModule } from "./exports/exports.module";
import { ExternalLinksModule } from "./external-links/external-links.module";
import { FestivalsModule } from "./festivals/festivals.module";
import { HealthModule } from "./health/health.module";
import { ImportsModule } from "./imports/imports.module";
import { MemoriesModule } from "./memories/memories.module";
import { PlaylistsModule } from "./playlists/playlists.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SongsModule } from "./songs/songs.module";
import { StatsModule } from "./stats/stats.module";
import { TagsModule } from "./tags/tags.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "30d" },
    }),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ArtistsModule,
    ImagesModule,
    AlbumsModule,
    SongsModule,
    TagsModule,
    ImportsModule,
    ExportsModule,
    MemoriesModule,
    FestivalsModule,
    PlaylistsModule,
    ExternalLinksModule,
    AnalysesModule,
    ContextModule,
    EnrichmentModule,
    StatsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
