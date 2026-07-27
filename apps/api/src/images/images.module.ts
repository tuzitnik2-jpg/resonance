import { Module } from "@nestjs/common";
import { ImagesController } from "./images.controller";
import { ImagesService } from "./images.service";
import { LookupModule } from "../lookup/lookup.module";

@Module({
  imports: [LookupModule],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
