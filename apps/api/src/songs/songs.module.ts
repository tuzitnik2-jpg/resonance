import { Module } from "@nestjs/common";
import { AnalysesModule } from "../analyses/analyses.module";
import { SongsController } from "./songs.controller";
import { SongsService } from "./songs.service";

@Module({
  imports: [AnalysesModule],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
