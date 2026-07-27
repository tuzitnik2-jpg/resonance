import { Module } from "@nestjs/common";
import { ExternalLinksController } from "./external-links.controller";
import { ExternalLinksService } from "./external-links.service";

@Module({
  controllers: [ExternalLinksController],
  providers: [ExternalLinksService],
})
export class ExternalLinksModule {}
