import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ExportsService } from "./exports.service";

@Controller("exports")
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get("full")
  async full(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.exportsService.fullExport(user);
    response.setHeader("Content-Disposition", 'attachment; filename="resonance-export.json"');
    return data;
  }

  @Get("songs.csv")
  async songsCsv(@Res() response: Response) {
    const csv = await this.exportsService.songsCsv();
    response
      .status(200)
      .setHeader("Content-Type", "text/csv; charset=utf-8")
      .setHeader("Content-Disposition", 'attachment; filename="resonance-songs.csv"')
      .send(csv);
  }
}
