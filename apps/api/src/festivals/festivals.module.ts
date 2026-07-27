import { Module } from "@nestjs/common";
import { FestivalsController } from "./festivals.controller";
import { FestivalsService } from "./festivals.service";

@Module({
  controllers: [FestivalsController],
  providers: [FestivalsService],
})
export class FestivalsModule {}
